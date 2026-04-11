import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useGetGlobalLeaderboard,
  useGetTokenBalance,
  useGetUserGames,
  useGetUserProfile,
  useGetUserTeams,
  useSaveCallerUserProfile,
  useUpdateProfilePicture,
} from "@/hooks/useQueries";
import type { UserProfile } from "@/types";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Calendar,
  Camera,
  Coins,
  Crown,
  Edit,
  LogIn,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Upload,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useFileUpload, useFileUrl } from "../blob-storage/FileStorage";

type Page =
  | "home"
  | "game"
  | "history"
  | "stats"
  | "leaderboard"
  | "profile"
  | "login"
  | "teams"
  | "wallet";

interface ProfilePageProps {
  onNavigate: (page: Page) => void;
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { identity, login, loginStatus } = useInternetIdentity();
  const principal = identity?.getPrincipal();

  const {
    data: profile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();
  const { data: userGames = [], isLoading: gamesLoading } =
    useGetUserGames(principal);
  const { data: globalLeaderboard = [], isLoading: leaderboardLoading } =
    useGetGlobalLeaderboard();
  const { data: userTeams = [], isLoading: teamsLoading } =
    useGetUserTeams(principal);
  const { data: tokenBalance = BigInt(0) } = useGetTokenBalance();

  const { uploadFile, isUploading } = useFileUpload();
  const { mutate: updateProfilePicture } = useUpdateProfilePicture();
  const { mutate: saveProfile } = useSaveCallerUserProfile();
  const { data: profilePictureUrl } = useFileUrl(profile?.profilePicture || "");

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isNameEditDialogOpen, setIsNameEditDialogOpen] = useState(false);
  const [_isProfileSetupOpen, _setIsProfileSetupOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [setupName, setSetupName] = useState("");

  const isAuthenticated = !!identity;
  const showProfileSetup =
    isAuthenticated && !profileLoading && isFetched && profile === null;

  // Profile setup dialog for new users
  if (showProfileSetup) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Strike Tracker!</CardTitle>
              <CardDescription>
                Let's set up your profile to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setupName">Your Name</Label>
                <Input
                  id="setupName"
                  placeholder="Enter your display name"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  if (!principal || !setupName.trim()) return;
                  const newProfile: UserProfile = {
                    principal,
                    displayName: setupName.trim(),
                    games: [],
                    achievements: [],
                    averageScore: BigInt(0),
                    totalSpares: BigInt(0),
                    totalStrikes: BigInt(0),
                    totalPoints: BigInt(0),
                    highestScore: BigInt(0),
                    gamesPlayed: BigInt(0),
                    profilePicture: undefined,
                  };
                  saveProfile(newProfile);
                }}
                disabled={!setupName.trim()}
                className="w-full"
              >
                Create Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show login prompt
  if (!identity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Profile</h1>
              <p className="text-muted-foreground">
                Sign in to view your personal bowling statistics and
                achievements
              </p>
            </div>
            <Button variant="outline" onClick={() => onNavigate("home")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>

          <Card>
            <CardContent className="text-center py-12">
              <LogIn className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Sign In Required</h3>
              <p className="text-muted-foreground mb-6">
                Please sign in with Internet Identity to access your profile and
                track your bowling progress.
              </p>
              <div className="space-y-4">
                <Button
                  onClick={login}
                  disabled={loginStatus === "logging-in"}
                  className="w-full max-w-xs"
                >
                  {loginStatus === "logging-in" ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In with Internet Identity
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Or continue as a guest and{" "}
                  <button
                    type="button"
                    onClick={() => onNavigate("home")}
                    className="text-primary hover:underline"
                  >
                    start playing
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getUserInitials = (name?: string) => {
    if (name) {
      const words = name.trim().split(" ");
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return words[0].slice(0, 2).toUpperCase();
    }
    if (!identity) return "U";
    const principalStr = identity.getPrincipal().toString();
    return principalStr.slice(0, 2).toUpperCase();
  };

  const getUserDisplayName = (name?: string) => {
    return name || `User ${identity?.getPrincipal().toString().slice(0, 8)}...`;
  };

  const getUserRank = () => {
    if (!profile || globalLeaderboard.length === 0) return null;
    const userPrincipal = profile.principal.toString();
    const rank = globalLeaderboard.findIndex(
      (player) => player.principal?.toString() === userPrincipal,
    );
    return rank >= 0 ? rank + 1 : null;
  };

  const getRecentGames = () => {
    return userGames
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      .slice(0, 5);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUploadProfilePicture = async () => {
    if (!selectedFile || !principal) return;

    try {
      const fileExtension = selectedFile.name.split(".").pop() || "jpg";
      const fileName = `profile-pictures/${principal.toString()}-${Date.now()}.${fileExtension}`;
      const { path } = await uploadFile(fileName, selectedFile);

      // FIXED: Removed principal parameter - backend uses caller-based authorization
      updateProfilePicture({ picturePath: path });

      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Failed to upload profile picture:", error);
      alert("Failed to upload profile picture. Please try again.");
    }
  };

  const handleUpdateName = () => {
    if (!profile || !editName.trim()) return;

    const updatedProfile: UserProfile = {
      ...profile,
      displayName: editName.trim(),
    };

    saveProfile(updatedProfile, {
      onSuccess: () => {
        setIsNameEditDialogOpen(false);
        setEditName("");
      },
    });
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  if (profileLoading || gamesLoading || leaderboardLoading || teamsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Profile</h1>
              <p className="text-muted-foreground">
                Your personal bowling statistics and achievements
              </p>
            </div>
            <Button variant="outline" onClick={() => onNavigate("home")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>

          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                Welcome to Strike Tracker!
              </h3>
              <p className="text-muted-foreground mb-6">
                Start playing games to build your bowling profile and track your
                progress.
              </p>
              <Button onClick={() => onNavigate("home")}>
                <Trophy className="w-4 h-4 mr-2" />
                Play Your First Game
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const userRank = getUserRank();
  const recentGames = getRecentGames();
  const displayName = getUserDisplayName(profile.displayName);
  const initials = getUserInitials(profile.displayName);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
            <p className="text-muted-foreground">
              Your personal bowling statistics and achievements
            </p>
          </div>
          <Button variant="outline" onClick={() => onNavigate("home")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <div className="space-y-6">
          {/* Profile Header with Picture Upload and Name Edit */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    {profilePictureUrl ? (
                      <AvatarImage
                        src={profilePictureUrl}
                        alt="Profile picture"
                      />
                    ) : null}
                    <AvatarFallback className="text-2xl bg-primary/10">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <Dialog
                    open={isUploadDialogOpen}
                    onOpenChange={setIsUploadDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Update Profile Picture</DialogTitle>
                        <DialogDescription>
                          Choose a new profile picture to personalize your
                          account. Supported formats: JPG, PNG, GIF. Max size:
                          5MB.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex flex-col items-center space-y-4">
                          {previewUrl ? (
                            <div className="relative">
                              <Avatar className="h-24 w-24">
                                <AvatarImage src={previewUrl} alt="Preview" />
                              </Avatar>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                onClick={clearSelection}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="h-24 w-24 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                              <Camera className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="picture">Select Image</Label>
                          <Input
                            id="picture"
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsUploadDialogOpen(false);
                              clearSelection();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleUploadProfilePicture}
                            disabled={!selectedFile || isUploading}
                          >
                            {isUploading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-2xl font-bold">{displayName}</h2>
                    <Dialog
                      open={isNameEditDialogOpen}
                      onOpenChange={setIsNameEditDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setEditName(profile.displayName)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Display Name</DialogTitle>
                          <DialogDescription>
                            Update your display name that appears throughout the
                            app.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="editName">Display Name</Label>
                            <Input
                              id="editName"
                              placeholder="Enter your display name"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsNameEditDialogOpen(false);
                                setEditName("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleUpdateName}
                              disabled={!editName.trim()}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Update Name
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>
                      Principal:{" "}
                      {identity?.getPrincipal().toString().slice(0, 20)}...
                    </span>
                    {userRank && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <div className="flex items-center space-x-1">
                          <Crown className="w-4 h-4" />
                          <span>Rank #{userRank}</span>
                        </div>
                      </>
                    )}
                    {userTeams.length > 0 && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>
                            {userTeams.length} Team
                            {userTeams.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div>
                    <p className="text-3xl font-bold text-primary">
                      {Number(profile.averageScore)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Average Score
                    </p>
                  </div>
                  <div className="flex items-center justify-end space-x-2">
                    <Coins className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-primary">
                      {Number(tokenBalance)} STK
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strike Token Balance Card */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wallet className="w-5 h-5" />
                <span>Strike Token Wallet</span>
              </CardTitle>
              <CardDescription>
                Your STK token balance and earnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {Number(tokenBalance)} STK
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Strike Tokens
                    </p>
                  </div>
                </div>
                <Button onClick={() => onNavigate("wallet")}>
                  <Wallet className="w-4 h-4 mr-2" />
                  Manage Wallet
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Team Memberships */}
          {userTeams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>My Teams</span>
                </CardTitle>
                <CardDescription>
                  Teams you're currently a member of
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userTeams.map((team) => {
                    const isCreator =
                      team.creator.toString() === principal?.toString();
                    return (
                      <div
                        key={Number(team.id)}
                        className="p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold">{team.name}</h4>
                          {isCreator && (
                            <Badge variant="secondary" className="text-xs">
                              <Crown className="w-3 h-3 mr-1" />
                              Creator
                            </Badge>
                          )}
                        </div>
                        {team.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {team.description}
                          </p>
                        )}
                        <div className="flex justify-between text-sm">
                          <span>{team.members.length} members</span>
                          <span>Avg: {Number(team.averageScore)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4">
                  <Button variant="outline" onClick={() => onNavigate("teams")}>
                    <Users className="w-4 h-4 mr-2" />
                    Manage Teams
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comprehensive Personal Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">
                      {Number(profile.gamesPlayed)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Games Played
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Target className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">
                      {Number(profile.highestScore)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Highest Score
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Star className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">
                      {Number(profile.totalPoints)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Points
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Zap className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">
                      {Number(profile.totalStrikes)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Strikes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Award className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">
                      {Number(profile.totalSpares)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Spares
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">
                      {Number(profile.averageScore)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Average Score
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Games */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Recent Games</span>
                </CardTitle>
                <CardDescription>Your latest bowling sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {recentGames.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No games played yet</p>
                    <Button className="mt-4" onClick={() => onNavigate("home")}>
                      Play Your First Game
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentGames.map((game) => {
                      const userScore = game.totalScores.find(
                        (_, index) =>
                          game.players[index]?.name ===
                          identity?.getPrincipal().toString(),
                      );
                      return (
                        <div
                          key={Number(game.id)}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              Game #{Number(game.id)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(
                                Number(game.timestamp) / 1000000,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="default">
                            {userScore ? Number(userScore) : 0} points
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="w-5 h-5" />
                  <span>Achievements</span>
                </CardTitle>
                <CardDescription>
                  Your bowling milestones and accomplishments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profile.achievements.length === 0 ? (
                    <div className="text-center py-8">
                      <Award className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No achievements yet
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Keep playing to unlock achievements!
                      </p>
                    </div>
                  ) : (
                    profile.achievements.map((achievement) => (
                      <div
                        key={achievement}
                        className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Award className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">{achievement}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Navigate to different sections of the app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <Button onClick={() => onNavigate("home")} className="w-full">
                  <Trophy className="w-4 h-4 mr-2" />
                  New Game
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate("wallet")}
                  className="w-full"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  My Wallet
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate("teams")}
                  className="w-full"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Teams
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate("history")}
                  className="w-full"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Game History
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate("leaderboard")}
                  className="w-full"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Global Leaderboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate("stats")}
                  className="w-full"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Global Stats
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
