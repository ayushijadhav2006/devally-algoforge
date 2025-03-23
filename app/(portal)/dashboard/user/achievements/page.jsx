"use client"

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, Medal, Star, Award, Gift, Target, 
  ChevronsUp, Zap, Clock, TrendingUp, CheckCircle2, 
  Calendar, User, Users, ShoppingBag, Heart, Globe
} from 'lucide-react';
import { useGamification } from '@/context/GamificationContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { TranslationModal } from '@/components/TranslationModal';

export default function UserAchievementsPage() {
  const { 
    userPoints, 
    userBadges, 
    userStats, 
    userLevel, 
    loading,
    getNextLevel,
    getLevelProgress,
    ACHIEVEMENTS,
    LEVELS
  } = useGamification();
  
  const { user, profile } = useAuth();
  const { language, translations } = useLanguage();
  const [progress, setProgress] = useState(0);
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  
  useEffect(() => {
    // Animate progress bar on load
    const levelProgress = getLevelProgress ? getLevelProgress() : 0;
    const timer = setTimeout(() => setProgress(levelProgress), 500);
    return () => clearTimeout(timer);
  }, [getLevelProgress]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        <p className="ml-3 text-gray-600">{translations.loading || "Loading..."}</p>
      </div>
    );
  }
  
  const nextLevel = getNextLevel ? getNextLevel() : null;
  
  // Map achievement icons to Lucide icons
  const getIconComponent = (iconString) => {
    switch(iconString) {
      case '🛍️': return <ShoppingBag className="h-6 w-6 text-pink-500" />;
      case '💰': return <Gift className="h-6 w-6 text-amber-500" />;
      case '💎': return <Award className="h-6 w-6 text-blue-500" />;
      case '🧩': return <Target className="h-6 w-6 text-purple-500" />;
      case '🤝': return <Users className="h-6 w-6 text-indigo-500" />;
      case '⭐': return <Star className="h-6 w-6 text-yellow-500" />;
      case '🌱': return <Zap className="h-6 w-6 text-green-500" />;
      default: return <Trophy className="h-6 w-6 text-orange-500" />;
    }
  };
  
  const earnedBadges = userBadges || [];
  const availableAchievements = ACHIEVEMENTS ? Object.values(ACHIEVEMENTS) : [];
  const pendingBadges = availableAchievements.filter(
    achievement => !earnedBadges.some(badge => badge.id === achievement.id)
  );
  
  return (
    <div className="container mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{translations.your_achievements || "Your Achievements"}</h1>
            <p className="text-muted-foreground mt-1">
              {translations.track_impact || "Track your impact and earn rewards for supporting NGOs"}
            </p>
          </div>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 mt-4 md:mt-0"
            onClick={() => setShowTranslationModal(true)}
          >
            <Globe className="h-4 w-4" />
            <span>{translations.translate || "Translate"}</span>
          </Button>
        </div>
      </motion.div>

      {/* User Level and Points */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">{translations.your_impact_level || "Your Impact Level"}</CardTitle>
            <CardDescription>
              {translations.level || "Level"} {userLevel?.level}: {userLevel?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {userPoints} / {nextLevel ? nextLevel.pointsRequired : `${userLevel?.pointsRequired}+`} {translations.points || "points"}
                </span>
                <span className="text-sm font-medium">
                  {nextLevel ? `${translations.next || "Next"}: ${nextLevel.name}` : translations.max_level_reached || 'Max Level Reached!'}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{translations.level || "Level"} {userLevel?.level}</span>
                {nextLevel && <span>{translations.level || "Level"} {nextLevel.level}</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">{translations.your_stats || "Your Stats"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="flex items-center">
                  <ShoppingBag className="mr-2 h-4 w-4 text-pink-500" />
                  {translations.purchases || "Purchases"}
                </span>
                <Badge variant="outline">{userStats?.totalPurchases || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center">
                  <Heart className="mr-2 h-4 w-4 text-red-500" />
                  {translations.donations || "Donations"}
                </span>
                <Badge variant="outline">{userStats?.totalDonations || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center">
                  <Users className="mr-2 h-4 w-4 text-indigo-500" />
                  {translations.activities || "Activities"}
                </span>
                <Badge variant="outline">{userStats?.activitiesJoined || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center">
                  <Target className="mr-2 h-4 w-4 text-purple-500" />
                  {translations.categories || "Categories"}
                </span>
                <Badge variant="outline">{userStats?.categories?.length || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="earned" className="space-y-4">
        <TabsList>
          <TabsTrigger value="earned">
            <Trophy className="mr-2 h-4 w-4" />
            {translations.earned_badges || "Earned Badges"} ({earnedBadges.length})
          </TabsTrigger>
          <TabsTrigger value="available">
            <Star className="mr-2 h-4 w-4" />
            {translations.available_badges || "Available Badges"} ({pendingBadges.length})
          </TabsTrigger>
          <TabsTrigger value="levels">
            <ChevronsUp className="mr-2 h-4 w-4" />
            {translations.levels || "Levels"}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="earned" className="space-y-4">
          {earnedBadges.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{translations.no_badges_yet || "No Badges Yet"}</CardTitle>
                <CardDescription>
                  {translations.start_supporting_ngos || "Start supporting NGOs to earn your first badges!"}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {earnedBadges.map((badge) => (
                <Card key={badge.id} className="overflow-hidden">
                  <CardHeader className="pb-2 flex flex-row items-center gap-3">
                    <div className="rounded-full p-3 bg-primary/10">
                      {getIconComponent(badge.icon)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{badge.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {translations.earned_on || "Earned on"} {badge.dateAwarded ? new Date(badge.dateAwarded.toDate ? badge.dateAwarded.toDate() : badge.dateAwarded).toLocaleDateString() : translations.unknown_date || 'Unknown date'}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{badge.description}</p>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      +{ACHIEVEMENTS && ACHIEVEMENTS[badge.id.toUpperCase()]?.points || 0} {translations.points || "points"}
                    </Badge>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="available" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {pendingBadges.map((achievement) => (
              <Card key={achievement.id} className="overflow-hidden opacity-70 border-dashed hover:opacity-100 transition-opacity">
                <CardHeader className="pb-2 flex flex-row items-center gap-3">
                  <div className="rounded-full p-3 bg-muted">
                    {getIconComponent(achievement.icon)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{achievement.name}</CardTitle>
                    <CardDescription className="text-xs">{translations.not_earned_yet || "Not earned yet"}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{achievement.description}</p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Badge variant="outline">+{achievement.points} {translations.points || "points"}</Badge>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="levels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{translations.level_progression || "Level Progression"}</CardTitle>
              <CardDescription>
                {translations.advance_through_levels || "Advance through levels as you earn more points"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {LEVELS && LEVELS.map((level) => (
                  <div key={level.level} className="relative">
                    <div className={`flex items-center p-3 rounded-lg ${userLevel?.level >= level.level ? 'bg-primary/10' : 'bg-muted'}`}>
                      <div className={`rounded-full p-2 mr-3 ${userLevel?.level >= level.level ? 'bg-primary/20' : 'bg-muted/50'}`}>
                        <span className="text-lg font-bold">{level.level}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{level.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {level.pointsRequired} {translations.points_required || "points required"}
                        </p>
                      </div>
                      {userLevel?.level >= level.level && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    {level.level < (LEVELS?.length || 0) && (
                      <div className="h-6 w-0.5 bg-border ml-6"></div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">{translations.how_to_earn_more || "How to Earn More Points"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-pink-500" />
                <CardTitle className="text-lg">{translations.purchase_merchandise || "Purchase Merchandise"}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {translations.buy_products_message || "Buy products from NGO stores to earn points and support their cause."}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                <CardTitle className="text-lg">{translations.make_donations || "Make Donations"}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {translations.donate_campaign_message || "Donate to campaigns and receive points based on your contribution."}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-lg">{translations.join_activities || "Join Activities"}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {translations.participate_ngo_activities || "Participate in NGO activities and events to earn significant points."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Translation Modal */}
      <TranslationModal 
        isOpen={showTranslationModal} 
        onClose={() => setShowTranslationModal(false)} 
      />
    </div>  
  );
}