'use client';

import { useState, useEffect } from 'react';
import { getCampaigns, getCampaignById, updateCampaignRaisedAmount } from '@/lib/campaign';
import { Search, Calendar, Clock, Users, MapPin, DollarSign, Heart, Globe, Building2, Filter, X } from 'lucide-react';
import { createDonation } from '@/lib/donations';
import { useLanguage } from '@/context/LanguageContext';
import { TranslationModal } from '@/components/TranslationModal';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from 'react-hot-toast';
import { getDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { collection } from 'firebase/firestore';
import { setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useGamification } from '@/context/GamificationContext';
import CampaignDonate from '@/components/ngo/campaigns/CampaignDonate';

export default function UserCampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNgo, setSelectedNgo] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [uniqueNgos, setUniqueNgos] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const { language, translations } = useLanguage();
  const { recordDonation } = useGamification();
  
  const categories = [
    'Environmental',
    'Healthcare',
    'Education',
    'Animal Welfare',
    'Humanitarian',
    'Arts & Culture'
  ];

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      const campaignsData = await getCampaigns();
      
      // Filter out expired campaigns and validate required fields
      const currentDate = new Date();
      const activeCampaigns = campaignsData.filter(campaign => {
        try {
          // Check for required fields
          if (!campaign.id || !campaign.ngoId) {
            console.error("Campaign missing required fields:", campaign);
            return false;
          }

          const campaignDate = new Date(campaign.date);
          return !isNaN(campaignDate.getTime()) && campaignDate >= currentDate;
        } catch (error) {
          console.error("Error parsing campaign date:", error);
          return false;
        }
      });
      
      // Sort campaigns by date (newest first)
      activeCampaigns.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Extract unique NGOs and categories
      const ngos = [...new Set(activeCampaigns.map(c => c.ngoName))];
      const categories = [...new Set(activeCampaigns.map(c => c.category))];
      
      setUniqueNgos(ngos);
      setUniqueCategories(categories);
      setCampaigns(activeCampaigns);
    } catch (error) {
      console.error("Error loading campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = 
      campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.shortdesc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.mission?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.ngoName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesNgo = selectedNgo === 'all' || campaign.ngoName === selectedNgo;
    const matchesCategory = !selectedCategory || campaign.category === selectedCategory;
    
    return matchesSearch && matchesNgo && matchesCategory;
  });

  const handleCampaignClick = async (campaign) => {
    // Get the latest campaign data to ensure we have the most up-to-date raised amount
    try {
      const updatedCampaign = await getCampaignById(campaign.id);
      setSelectedCampaign(updatedCampaign || campaign);
    } catch (error) {
      console.error("Error fetching updated campaign:", error);
      setSelectedCampaign(campaign);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCampaign(null);
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Invalid date';
    }
  };

  // Add this function to check if a campaign is expired
  const isExpired = (date) => {
    if (!date) return false;
    try {
      const campaignDate = new Date(date);
      const now = new Date();
      return campaignDate < now;
    } catch (error) {
      console.error("Error checking expiry:", error);
      return false;
    }
  };

  // Format time for display
  const formatTime = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Error formatting time:", error);
      return 'Invalid time';
    }
  };

  // Calculate progress percentage
  const calculateProgress = (campaign) => {
    if (!campaign.requiredAmount || campaign.requiredAmount === 0) return 0;
    const raisedAmount = campaign.raisedAmount || 0;
    const percentage = (raisedAmount / campaign.requiredAmount) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  };

  // Check if campaign has reached or exceeded its goal
  const isGoalReached = (campaign) => {
    if (!campaign.requiredAmount || campaign.requiredAmount === 0) return false;
    const raisedAmount = campaign.raisedAmount || 0;
    return raisedAmount >= campaign.requiredAmount;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{translations.support_campaigns || "Support Our Campaigns"}</h1>
          <p className="text-gray-600">{translations.browse_donate_message || "Browse and donate to our campaigns to help make a positive impact in our community."}</p>
        </div>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => setShowTranslationModal(true)}
        >
          <Globe className="h-4 w-4" />
          <span>{translations.translate || "Translate"}</span>
        </Button>
      </header>

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="relative w-full md:w-1/2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={translations.search_placeholder || "Search campaigns..."}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button 
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => setShowCategoryModal(true)}
        >
          <Filter className="h-4 w-4" />
          <span>Filter by Category</span>
        </Button>
      </div>

      {/* Category Filter Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Filter NGOs by Category</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Select a category to filter the NGO list</p>
            
            <div className="grid grid-cols-2 gap-4">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category === selectedCategory ? '' : category);
                    setShowCategoryModal(false);
                  }}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    category === selectedCategory
                      ? 'border-[#1CAC78] bg-[#1CAC78]/10 text-[#1CAC78]'
                      : 'border-gray-200 hover:border-[#1CAC78] hover:bg-[#1CAC78]/5'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory('');
                  setShowCategoryModal(false);
                }}
                className="w-full"
              >
                Show All
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedCategory && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">Filtered by:</span>
          <Badge variant="secondary" className="flex items-center gap-1">
            {selectedCategory}
            <button 
              onClick={() => setSelectedCategory('')}
              className="ml-1 hover:text-gray-700"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-gray-100 rounded-full">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">No Active Campaigns Found</h3>
            <p className="text-gray-500 max-w-md">
              {searchTerm || selectedNgo !== 'all' || selectedCategory !== '' 
                ? "Try adjusting your filters or search terms."
                : "There are no active campaigns at the moment. Please check back later."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <div 
              key={campaign.id} 
              className="border border-gray-200 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer bg-white"
              onClick={() => handleCampaignClick(campaign)}
            >
              <div className="relative">
                <img 
                  src={campaign.image || '/api/placeholder/600/300'} 
                  alt={campaign.name} 
                  className="w-full h-48 object-cover" 
                />
                <div className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md">
                  <Heart className="h-5 w-5 text-red-500" />
                </div>
                {campaign.category && (
                  <Badge className="absolute top-2 left-2" variant="secondary">
                    {campaign.category}
                  </Badge>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Building2 className="h-4 w-4" />
                  <span>{campaign.ngoName}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{campaign.name}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{campaign.shortdesc}</p>
                
                {/* Funding Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">₹{campaign.raisedAmount || 0} {translations.raised || "raised"}</span>
                    <span className="text-gray-500">{translations.of || "of"} ₹{campaign.requiredAmount || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        isGoalReached(campaign) ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${calculateProgress(campaign)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(campaign.date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{campaign.location}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campaign Details Modal */}
      {isModalOpen && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-90vh overflow-y-auto">
            <div className="relative">
              <img 
                src={selectedCampaign.image || '/api/placeholder/600/300'} 
                alt={selectedCampaign.name} 
                className="w-full h-64 object-cover" 
              />
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedCampaign.name}</h2>
              <p className="text-gray-600 mb-6">{selectedCampaign.shortdesc}</p>
              
              {/* Funding Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">₹{selectedCampaign.raisedAmount || 0} {translations.raised || "raised"}</span>
                  <span className="text-gray-500">{translations.goal || "Goal"}: ₹{selectedCampaign.requiredAmount || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-600 h-3 rounded-full" 
                    style={{ width: `${calculateProgress(selectedCampaign)}%` }}
                  ></div>
                </div>
                {isGoalReached(selectedCampaign) && (
                  <div className="text-green-600 text-sm mt-1 font-medium">{translations.goal_reached || "Goal reached! Thank you for your support."}</div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">{translations.campaign_details || "Campaign Details"}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <span>{translations.date || "Date"}: {formatDate(selectedCampaign.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <span>{translations.time || "Time"}: {formatTime(selectedCampaign.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-500" />
                      <span>{translations.location || "Location"}: {selectedCampaign.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <span>{translations.volunteers_needed || "Volunteers Needed"}: {selectedCampaign.volunteers}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-500" />
                      <span>{translations.required_amount || "Required Amount"}: ₹{selectedCampaign.requiredAmount || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">{translations.mission || "Mission"}</h3>
                  <p>{selectedCampaign.mission}</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-4">
                <button 
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {translations.close || "Close"}
                </button>
                {isGoalReached(selectedCampaign) ? (
                  <button 
                    className="px-4 py-2 rounded-lg bg-gray-400 text-white cursor-not-allowed"
                    disabled
                  >
                    {translations.goal_reached_short || 'Goal Reached'}
                  </button>
                ) : (
                  <CampaignDonate campaign={selectedCampaign} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Translation Modal */}
      <TranslationModal 
        isOpen={showTranslationModal} 
        onClose={() => setShowTranslationModal(false)} 
      />
    </div>
  );
}