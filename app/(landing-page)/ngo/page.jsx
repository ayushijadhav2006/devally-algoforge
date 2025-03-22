"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Navigation,
  Sparkles,
  MapPin,
  Users,
  Globe,
  Phone,
  ArrowRight,
  Star,
  Wallet,
  SortDesc,
  Search,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";

// Dynamically import Leaflet Map component
const Map = dynamic(() => import("@/components/map/Map"), { ssr: false });

const NGOListPage = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyNGOs, setNearbyNGOs] = useState([]);
  const [allNGOs, setAllNGOs] = useState([]);
  const [filteredNGOs, setFilteredNGOs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [sortByRating, setSortByRating] = useState(false);

  // Function to sort NGOs by rating
  const sortNGOs = (ngos) => {
    if (sortByRating) {
      return [...ngos].sort((a, b) => (b.ngoRating || 0) - (a.ngoRating || 0));
    }
    return ngos;
  };

  // Function to filter NGOs based on search term
  const filterNGOs = (ngos, term) => {
    if (!term) return ngos;
    return ngos.filter(
      (ngo) =>
        ngo.ngoName?.toLowerCase().includes(term.toLowerCase()) ||
        ngo.description?.toLowerCase().includes(term.toLowerCase()) ||
        ngo.category?.toLowerCase().includes(term.toLowerCase())
    );
  };

  // Update filtered NGOs when search term changes
  useEffect(() => {
    const currentNGOs = activeTab === "all" ? allNGOs : nearbyNGOs;
    setFilteredNGOs(filterNGOs(currentNGOs, searchTerm));
  }, [searchTerm, allNGOs, nearbyNGOs, activeTab]);

  // Function to fetch all NGOs
  const fetchAllNGOs = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "ngo"));
      const ngosData = [];
      querySnapshot.forEach((doc) => {
        const ngoData = doc.data();
        ngoData.id = doc.id;
        ngosData.push(ngoData);
      });
      setAllNGOs(ngosData);
      setIsLoadingAll(false);
    } catch (error) {
      console.error("Error fetching NGOs:", error);
      setIsLoadingAll(false);
    }
  };

  // Function to fetch nearby NGOs from API
  const fetchNearbyNGOs = async (latitude, longitude) => {
    try {
      const response = await fetch("http://localhost:8000/nearby-ngos/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude,
          longitude,
          radius: 50, // 50km radius
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch nearby NGOs");
      }

      const data = await response.json();
      // Sort NGOs by distance
      const sortedNGOs = data.sort((a, b) => a.distance - b.distance);
      setNearbyNGOs(sortedNGOs);
      return sortedNGOs;
    } catch (error) {
      console.error("Error fetching nearby NGOs:", error);
      return [];
    }
  };

  // Function to get user's location and fetch nearby NGOs
  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(newLocation);
        setIsLoadingLocation(false);
        setLocationError(null);

        // Fetch nearby NGOs when location is obtained
        await fetchNearbyNGOs(newLocation.latitude, newLocation.longitude);
      },
      (error) => {
        console.log("Geolocation error:", error);
        let errorMessage = "Unable to get your location. ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage +=
              "Please enable location services to see nearby NGOs.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out.";
            break;
          default:
            errorMessage += error.message;
        }
        setLocationError(errorMessage);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  // Get location and fetch all NGOs when component mounts
  useEffect(() => {
    fetchAllNGOs();
    getLocation();
  }, []);

  const renderNGOCard = (ngo) => (
    <Card
      key={ngo.id || ngo.ngo_id}
      className="overflow-hidden hover:shadow-lg transition-all duration-300 group"
    >
      <div className="flex flex-col md:flex-row">
        <div className="relative h-48 md:w-48 md:h-auto">
          <Image
            src={ngo.logoUrl || "/placeholder.svg"}
            alt={ngo.ngoName}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {ngo.distance && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-emerald-600 text-white">
                {ngo.distance.toFixed(1)} km away
              </Badge>
            </div>
          )}
        </div>
        <div className="flex-1 p-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xl font-bold mb-2 text-gray-900">
                {ngo.ngoName}
              </h4>
              {ngo.category && (
                <Badge variant="outline" className="mb-2">
                  {ngo.category}
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Wallet className="h-4 w-4 mr-1" />
              Donate
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-gray-600">
            {ngo.contact && (
              <div className="flex items-center">
                <Phone className="h-4 w-4 text-emerald-600 mr-2" />
                <span>{ngo.contact}</span>
              </div>
            )}
            {ngo.email && (
              <div className="flex items-center">
                <Globe className="h-4 w-4 text-emerald-600 mr-2" />
                <span className="truncate">{ngo.email}</span>
              </div>
            )}
            {ngo.memberCount && (
              <div className="flex items-center">
                <Users className="h-4 w-4 text-emerald-600 mr-2" />
                <span>{ngo.memberCount} members</span>
              </div>
            )}
            <div className="flex items-center">
              <Star className="h-4 w-4 text-emerald-600 mr-2" />
              <span>
                {ngo.ngoRating
                  ? `${ngo.ngoRating.toFixed(1)} rating`
                  : "Not rated yet"}
              </span>
            </div>
          </div>

          {ngo.description && (
            <p className="mt-3 text-sm text-gray-600 line-clamp-2">
              {ngo.description}
            </p>
          )}

          <div className="mt-4 flex justify-between items-center">
            <Link
              href={`/ngo/${ngo.id || ngo.ngo_id}`}
              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm inline-flex items-center group"
            >
              View Details
              <ArrowRight className="h-4 w-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href={`/ngo/${ngo.id || ngo.ngo_id}/rate-ngo`}
              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm inline-flex items-center"
            >
              Rate NGO
              <Star className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto py-24 px-4">
        <div className="mb-20">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            NGO Directory
          </h1>

          {/* Search Bar */}
          <div className="relative mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search NGOs by name, category, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>
          </div>

          {/* Navigation and Sorting Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Tabs */}
            <div className="flex space-x-4">
              <Button
                variant={activeTab === "all" ? "default" : "outline"}
                onClick={() => setActiveTab("all")}
                className="flex-1 sm:flex-none"
              >
                All NGOs
              </Button>
              <Button
                variant={activeTab === "nearby" ? "default" : "outline"}
                onClick={() => setActiveTab("nearby")}
                className="flex-1 sm:flex-none"
              >
                Nearby NGOs
              </Button>
            </div>

            {/* Sort Button */}
            <Button
              variant={sortByRating ? "default" : "outline"}
              onClick={() => setSortByRating(!sortByRating)}
              className="flex items-center gap-2"
            >
              <SortDesc className="h-4 w-4" />
              {sortByRating ? "Sorted by Rating" : "Sort by Rating"}
            </Button>
          </div>
        </div>

        {activeTab === "all" ? (
          // All NGOs View
          <div className="space-y-6">
            <Card>
              <CardHeader className="p-4">
                <h3 className="text-lg font-semibold">
                  All NGOs {sortByRating && "- Sorted by Rating"}
                </h3>
              </CardHeader>
              <CardContent className="p-4">
                {isLoadingAll ? (
                  <div className="flex items-center justify-center py-8">
                    <Sparkles className="h-8 w-8 text-emerald-600 animate-spin" />
                    <span className="ml-2">Loading NGOs...</span>
                  </div>
                ) : filteredNGOs.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {sortNGOs(filteredNGOs).map((ngo) => renderNGOCard(ngo))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {searchTerm
                        ? "No NGOs match your search"
                        : "No NGOs found"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // Nearby NGOs View with Map
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Card>
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Nearby NGOs {sortByRating && "- Sorted by Rating"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {filteredNGOs.length} NGOs found nearby
                      </p>
                    </div>
                    {locationError && (
                      <Button onClick={getLocation}>
                        <Navigation className="h-4 w-4 mr-2" />
                        Enable Location
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {isLoadingLocation ? (
                    <div className="flex items-center justify-center py-8">
                      <Sparkles className="h-8 w-8 text-emerald-600 animate-spin" />
                      <span className="ml-2">Finding nearby NGOs...</span>
                    </div>
                  ) : locationError ? (
                    <div className="text-center py-8">
                      <p className="text-red-500 mb-4">{locationError}</p>
                      <Button onClick={getLocation}>Enable Location</Button>
                    </div>
                  ) : filteredNGOs.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {sortNGOs(filteredNGOs).map((ngo) => renderNGOCard(ngo))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {searchTerm
                          ? "No NGOs match your search"
                          : "No NGOs found nearby"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:sticky lg:top-24 h-[600px]">
              <Card className="h-full overflow-hidden">
                {isLoadingLocation ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <Sparkles className="h-8 w-8 text-emerald-600 mb-2 mx-auto animate-spin" />
                      <p>Loading map...</p>
                    </div>
                  </div>
                ) : locationError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center p-4">
                      <p className="text-red-500 mb-2">{locationError}</p>
                      <Button onClick={getLocation}>Enable Location</Button>
                    </div>
                  </div>
                ) : userLocation ? (
                  <div className="h-full w-full">
                    <Map userLocation={userLocation} nearbyNGOs={nearbyNGOs} />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center p-4">
                      <p className="text-gray-600 mb-4">
                        Enable location to see nearby NGOs
                      </p>
                      <Button onClick={getLocation}>Enable Location</Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NGOListPage;
