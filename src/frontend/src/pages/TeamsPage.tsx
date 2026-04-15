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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useAcceptInvitation,
  useApproveJoinRequest,
  useCreateTeam,
  useDeclineInvitation,
  useDenyJoinRequest,
  useGetAllTeams,
  useGetAllUserProfiles,
  useGetCallerUserProfile,
  useGetInvitations,
  useGetJoinRequests,
  useGetUserTeams,
  useInviteToTeam,
  useLeaveTeam,
  useRequestToJoinTeam,
  useSaveCallerUserProfile,
} from "@/hooks/useQueries";
import type { Team, UserProfile } from "@/types";
import type { Principal } from "@dfinity/principal";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  Crown,
  LogIn,
  Mail,
  Plus,
  Search,
  Star,
  Target,
  Trophy,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useFileUrl } from "../blob-storage/FileStorage";

type Page =
  | "home"
  | "game"
  | "history"
  | "stats"
  | "leaderboard"
  | "profile"
  | "login"
  | "teams";

interface TeamsPageProps {
  onNavigate: (page: Page) => void;
}

export function TeamsPage({ onNavigate }: TeamsPageProps) {
  const { identity, login, loginStatus } = useInternetIdentity();
  const principal = identity?.getPrincipal();

  const { data: allTeams = [], isLoading: teamsLoading } = useGetAllTeams();
  const { data: userTeams = [], isLoading: userTeamsLoading } =
    useGetUserTeams(principal);
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();
  const { data: joinRequests = [] } = useGetJoinRequests();
  const { data: invitations = [] } = useGetInvitations();
  const { data: allUserProfiles = [] } = useGetAllUserProfiles();

  const { mutate: createTeam, isPending: isCreating } = useCreateTeam();
  const { mutate: leaveTeam, isPending: isLeaving } = useLeaveTeam();
  const { mutate: saveProfile } = useSaveCallerUserProfile();
  const { mutate: requestToJoinTeam, isPending: isRequesting } =
    useRequestToJoinTeam();
  const { mutate: approveJoinRequest, isPending: isApproving } =
    useApproveJoinRequest();
  const { mutate: denyJoinRequest, isPending: isDenying } =
    useDenyJoinRequest();
  const { mutate: inviteToTeam, isPending: isInviting } = useInviteToTeam();
  const { mutate: acceptInvitation, isPending: isAccepting } =
    useAcceptInvitation();
  const { mutate: declineInvitation, isPending: isDeclining } =
    useDeclineInvitation();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [_isProfileSetupOpen, _setIsProfileSetupOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedTeamForInvite, setSelectedTeamForInvite] =
    useState<Team | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [userName, setUserName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserToInvite, setSelectedUserToInvite] = useState<string>("");

  const isAuthenticated = !!identity;
  const showProfileSetup =
    isAuthenticated && !profileLoading && isFetched && userProfile === null;

  // Filter teams and requests
  const filteredTeams = allTeams.filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const availableTeams = filteredTeams.filter(
    (team) =>
      !userTeams.some((userTeam) => Number(userTeam.id) === Number(team.id)),
  );

  const userJoinRequests = joinRequests.filter(
    (req) => principal && req.requester.toString() === principal.toString(),
  );

  const teamJoinRequests = joinRequests.filter((req) =>
    userTeams.some(
      (team) =>
        Number(team.id) === Number(req.teamId) &&
        principal &&
        team.creator.toString() === principal.toString(),
    ),
  );

  const userInvitations = invitations.filter(
    (inv) => principal && inv.invitee.toString() === principal.toString(),
  );

  const getUserDisplayName = (profile?: UserProfile) => {
    if (!profile) return "Unknown User";
    return (
      profile.displayName ||
      `User ${profile.principal.toString().slice(0, 8)}...`
    );
  };

  const getUserInitials = (profile?: UserProfile) => {
    if (!profile) return "U";
    if (profile.displayName) {
      const words = profile.displayName.trim().split(" ");
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return words[0].slice(0, 2).toUpperCase();
    }
    const principalStr = profile.principal.toString();
    return principalStr.slice(0, 2).toUpperCase();
  };

  const handleCreateProfile = () => {
    if (!principal || !userName.trim()) return;

    const newProfile: UserProfile = {
      principal,
      displayName: userName.trim(),
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

    saveProfile(newProfile, {
      onSuccess: () => {
        _setIsProfileSetupOpen(false);
        setUserName("");
      },
    });
  };

  const handleCreateTeam = () => {
    if (!principal || !teamName.trim()) return;

    createTeam(
      {
        name: teamName.trim(),
        description: teamDescription.trim(),
      },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          setTeamName("");
          setTeamDescription("");
        },
      },
    );
  };

  const handleRequestToJoin = (teamId: bigint) => {
    if (!principal) return;
    requestToJoinTeam({ teamId });
  };

  const handleLeaveTeam = (teamId: bigint) => {
    if (!principal) return;
    leaveTeam({ teamId });
  };

  const handleApproveRequest = (teamId: bigint, requester: Principal) => {
    if (!principal) return;
    approveJoinRequest({ teamId, requester });
  };

  const handleDenyRequest = (teamId: bigint, requester: Principal) => {
    if (!principal) return;
    denyJoinRequest({ teamId, requester });
  };

  const handleInviteUser = () => {
    if (!principal || !selectedTeamForInvite || !selectedUserToInvite) return;

    const inviteeProfile = allUserProfiles.find(
      (p) => p.principal.toString() === selectedUserToInvite,
    );
    if (!inviteeProfile) return;

    inviteToTeam(
      {
        teamId: selectedTeamForInvite.id,
        invitee: inviteeProfile.principal,
      },
      {
        onSuccess: () => {
          setIsInviteDialogOpen(false);
          setSelectedTeamForInvite(null);
          setSelectedUserToInvite("");
        },
      },
    );
  };

  const handleAcceptInvitation = (teamId: bigint) => {
    if (!principal) return;
    acceptInvitation({ teamId });
  };

  const handleDeclineInvitation = (teamId: bigint) => {
    if (!principal) return;
    declineInvitation({ teamId });
  };

  const getTeamById = (teamId: bigint) => {
    return allTeams.find((team) => Number(team.id) === Number(teamId));
  };

  const getUserProfileByPrincipal = (principal: Principal) => {
    return allUserProfiles.find(
      (profile) => profile.principal.toString() === principal.toString(),
    );
  };

  const hasRequestedToJoin = (teamId: bigint) => {
    return userJoinRequests.some(
      (req) => Number(req.teamId) === Number(teamId),
    );
  };

  const hasInvitationFor = (teamId: bigint) => {
    return userInvitations.some((inv) => Number(inv.teamId) === Number(teamId));
  };

  // Profile setup dialog
  if (showProfileSetup) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Strike Tracker!</CardTitle>
              <CardDescription>
                Let's set up your profile to get started with teams.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userName">Your Name</Label>
                <Input
                  id="userName"
                  placeholder="Enter your display name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreateProfile}
                disabled={!userName.trim()}
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
              <h1 className="text-3xl font-bold mb-2">Teams</h1>
              <p className="text-muted-foreground">
                Join bowling teams to compete and track group performance
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
                Please sign in with Internet Identity to create and join bowling
                teams.
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

  const isLoading = teamsLoading || userTeamsLoading || profileLoading;

  const SkeletonTeamCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="flex space-x-2 pt-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Teams</h1>
            <p className="text-muted-foreground">
              Create and join bowling teams to compete together
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                  <DialogDescription>
                    Create a bowling team and invite others to join your group.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Team Name</Label>
                    <Input
                      id="teamName"
                      placeholder="Enter team name"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teamDescription">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="teamDescription"
                      placeholder="Describe your team..."
                      value={teamDescription}
                      onChange={(e) => setTeamDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setTeamName("");
                        setTeamDescription("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateTeam}
                      disabled={!teamName.trim() || isCreating}
                    >
                      {isCreating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Team
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => onNavigate("home")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>

        <Tabs defaultValue="my-teams" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="my-teams">
              My Teams {!isLoading && `(${userTeams.length})`}
            </TabsTrigger>
            <TabsTrigger value="browse">
              Browse {!isLoading && `(${availableTeams.length})`}
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests {!isLoading && `(${teamJoinRequests.length})`}
            </TabsTrigger>
            <TabsTrigger value="invitations">
              Invitations {!isLoading && `(${userInvitations.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-teams" className="space-y-6">
            {isLoading ? <SkeletonTeamCards /> : userTeams.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Teams Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create your first team or join an existing one to get
                    started.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Team
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userTeams.map((team) => (
                  <TeamCard
                    key={Number(team.id)}
                    team={team}
                    isUserTeam={true}
                    onLeave={() => handleLeaveTeam(team.id)}
                    onInvite={() => {
                      setSelectedTeamForInvite(team);
                      setIsInviteDialogOpen(true);
                    }}
                    isLeaving={isLeaving}
                    userPrincipal={principal}
                    allUserProfiles={allUserProfiles}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="browse" className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? <SkeletonTeamCards /> : availableTeams.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    {searchTerm ? "No Teams Found" : "No Available Teams"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm
                      ? "Try adjusting your search terms or create a new team."
                      : "All teams have been joined or create the first team!"}
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Team
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableTeams.map((team) => (
                  <TeamCard
                    key={Number(team.id)}
                    team={team}
                    isUserTeam={false}
                    onRequestJoin={() => handleRequestToJoin(team.id)}
                    isRequesting={isRequesting}
                    userPrincipal={principal}
                    hasRequested={hasRequestedToJoin(team.id)}
                    hasInvitation={hasInvitationFor(team.id)}
                    onAcceptInvitation={() => handleAcceptInvitation(team.id)}
                    onDeclineInvitation={() => handleDeclineInvitation(team.id)}
                    isAccepting={isAccepting}
                    isDeclining={isDeclining}
                    allUserProfiles={allUserProfiles}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            {teamJoinRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    No Join Requests
                  </h3>
                  <p className="text-muted-foreground">
                    When users request to join your teams, they'll appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {teamJoinRequests.map((request) => {
                  const team = getTeamById(request.teamId);
                  const requesterProfile = getUserProfileByPrincipal(
                    request.requester,
                  );

                  return (
                    <Card
                      key={`${request.teamId}-${request.requester.toString()}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-primary/10">
                                {getUserInitials(requesterProfile)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold">Join Request</h4>
                              <p className="text-sm text-muted-foreground">
                                {getUserDisplayName(requesterProfile)} wants to
                                join <strong>{team?.name}</strong>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(
                                  Number(request.timestamp) / 1000000,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleApproveRequest(
                                  request.teamId,
                                  request.requester,
                                )
                              }
                              disabled={isApproving}
                            >
                              {isApproving ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleDenyRequest(
                                  request.teamId,
                                  request.requester,
                                )
                              }
                              disabled={isDenying}
                            >
                              {isDenying ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invitations" className="space-y-6">
            {userInvitations.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Invitations</h3>
                  <p className="text-muted-foreground">
                    When team creators invite you to join their teams, they'll
                    appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {userInvitations.map((invitation) => {
                  const team = getTeamById(invitation.teamId);
                  const inviterProfile = invitation.inviter
                    ? getUserProfileByPrincipal(invitation.inviter)
                    : null;

                  return (
                    <Card
                      key={`${invitation.teamId}-${invitation.invitee.toString()}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-primary/10">
                                <Crown className="w-6 h-6" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold">Team Invitation</h4>
                              <p className="text-sm text-muted-foreground">
                                You're invited to join{" "}
                                <strong>{team?.name}</strong>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Invited by{" "}
                                {getUserDisplayName(
                                  inviterProfile ?? undefined,
                                )}{" "}
                                •{" "}
                                {new Date(
                                  Number(invitation.timestamp) / 1000000,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleAcceptInvitation(invitation.teamId)
                              }
                              disabled={isAccepting}
                            >
                              {isAccepting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              ) : (
                                <Check className="w-4 h-4 mr-2" />
                              )}
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleDeclineInvitation(invitation.teamId)
                              }
                              disabled={isDeclining}
                            >
                              {isDeclining ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                              ) : (
                                <X className="w-4 h-4 mr-2" />
                              )}
                              Decline
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Invite User Dialog */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite User to Team</DialogTitle>
              <DialogDescription>
                Invite a user to join {selectedTeamForInvite?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userSelect">Select User</Label>
                <Select
                  value={selectedUserToInvite}
                  onValueChange={setSelectedUserToInvite}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user to invite" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUserProfiles
                      .filter(
                        (profile) =>
                          // Exclude current user and existing team members
                          profile.principal.toString() !==
                            principal?.toString() &&
                          selectedTeamForInvite &&
                          !selectedTeamForInvite.members.some(
                            (member) =>
                              member.toString() ===
                              profile.principal.toString(),
                          ) &&
                          // Exclude users who already have pending invitations
                          !invitations.some(
                            (inv) =>
                              Number(inv.teamId) ===
                                Number(selectedTeamForInvite.id) &&
                              inv.invitee.toString() ===
                                profile.principal.toString(),
                          ),
                      )
                      .map((profile) => (
                        <SelectItem
                          key={profile.principal.toString()}
                          value={profile.principal.toString()}
                        >
                          {getUserDisplayName(profile)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsInviteDialogOpen(false);
                    setSelectedTeamForInvite(null);
                    setSelectedUserToInvite("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInviteUser}
                  disabled={!selectedUserToInvite || isInviting}
                >
                  {isInviting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Inviting...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface TeamCardProps {
  team: Team;
  isUserTeam: boolean;
  onRequestJoin?: () => void;
  onLeave?: () => void;
  onInvite?: () => void;
  onAcceptInvitation?: () => void;
  onDeclineInvitation?: () => void;
  isRequesting?: boolean;
  isLeaving?: boolean;
  isAccepting?: boolean;
  isDeclining?: boolean;
  userPrincipal?: any;
  hasRequested?: boolean;
  hasInvitation?: boolean;
  allUserProfiles: UserProfile[];
}

function TeamCard({
  team,
  isUserTeam,
  onRequestJoin,
  onLeave,
  onInvite,
  onAcceptInvitation,
  onDeclineInvitation,
  isRequesting,
  isLeaving,
  isAccepting,
  isDeclining,
  userPrincipal,
  hasRequested,
  hasInvitation,
  allUserProfiles,
}: TeamCardProps) {
  const isCreator =
    userPrincipal && team.creator.toString() === userPrincipal.toString();

  const getUserDisplayName = (principal: Principal) => {
    const profile = allUserProfiles.find(
      (p) => p.principal.toString() === principal.toString(),
    );
    if (!profile) return `User ${principal.toString().slice(0, 8)}...`;
    return profile.displayName || `User ${principal.toString().slice(0, 8)}...`;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <span>{team.name}</span>
            </CardTitle>
            {team.description && (
              <CardDescription className="mt-2">
                {team.description}
              </CardDescription>
            )}
          </div>
          {isCreator && (
            <Badge variant="secondary" className="ml-2">
              <Crown className="w-3 h-3 mr-1" />
              Creator
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">
              {team.members.length}
            </p>
            <p className="text-xs text-muted-foreground">Members</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">
              {Number(team.averageScore)}
            </p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">
              {Number(team.bestScore)}
            </p>
            <p className="text-xs text-muted-foreground">Best Score</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Games:</span>
            <span className="font-medium">{Number(team.totalGames)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Created:</span>
            <span className="font-medium">
              {new Date(Number(team.createdAt) / 1000000).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Creator:</span>
            <span className="font-medium">
              {getUserDisplayName(team.creator)}
            </span>
          </div>
        </div>

        <div className="pt-2 space-y-2">
          {isUserTeam ? (
            <>
              {isCreator && (
                <Button variant="outline" className="w-full" onClick={onInvite}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Members
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={onLeave}
                disabled={isLeaving || isCreator}
              >
                {isLeaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Leaving...
                  </>
                ) : isCreator ? (
                  <>
                    <Crown className="w-4 h-4 mr-2" />
                    Team Creator
                  </>
                ) : (
                  <>
                    <UserMinus className="w-4 h-4 mr-2" />
                    Leave Team
                  </>
                )}
              </Button>
            </>
          ) : hasInvitation ? (
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={onAcceptInvitation}
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Accept Invitation
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={onDeclineInvitation}
                disabled={isDeclining}
              >
                {isDeclining ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Declining...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Decline Invitation
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={onRequestJoin}
              disabled={isRequesting || hasRequested}
            >
              {isRequesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Requesting...
                </>
              ) : hasRequested ? (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Request Sent
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Request to Join
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
