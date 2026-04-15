import { principalToAccountIdSync } from "@/lib/accountId";
import { sendIcpViaLedger } from "@/lib/icpLedger";
import type {
  ChatMessage,
  Frame,
  Game,
  Invitation,
  JoinRequest,
  PaymentTransaction,
  Player,
  PriceFeed,
  Team,
  TokenTransaction,
  UserProfile,
  Wallet,
} from "@/types";
import { UserRole } from "@/types";
import type { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// ICPPriceData type for the price feed system
interface ICPPriceData {
  price: number;
  change24h: number;
  lastUpdated: number;
  source: string;
  status: "live" | "cached" | "error";
}

export function useGetAllGames() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllGames(BigInt(0), BigInt(100));
    },
    enabled: !!actor && !isFetching,
    staleTime: 2 * 60_000,
  });
}

export function useGetGame(gameId: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["game", gameId.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getGame(gameId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllPlayerStats() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["playerStats"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPlayerStats(BigInt(0), BigInt(100));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPlayerStats(playerName: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["playerStats", playerName],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPlayerStats(playerName);
    },
    enabled: !!actor && !isFetching && !!playerName,
  });
}

export function useGetLeaderboard() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLeaderboard(BigInt(0), BigInt(100));
    },
    enabled: !!actor && !isFetching,
    staleTime: 2 * 60_000,
  });
}

export function useGetGlobalLeaderboard() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["globalLeaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      const profiles = await actor.getAllUserProfiles(BigInt(0), BigInt(100));
      return profiles
        .filter((profile) => profile.games.length > 0)
        .sort((a, b) => Number(b.averageScore) - Number(a.averageScore));
    },
    enabled: !!actor && !isFetching,
    staleTime: 2 * 60_000,
  });
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(principal?: Principal) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["userProfile", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      return actor.getUserProfile(principal);
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

export function useGetUserGames(principal?: Principal) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["userGames", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return [];
      const profile = await actor.getUserProfile(principal);
      if (!profile) return [];

      const results = await Promise.all(profile.games.map((id) => actor.getGame(id)));
      return results.filter((g): g is Game => g !== null && g !== undefined);
    },
    enabled: !!actor && !isFetching && !!principal,
    staleTime: 2 * 60_000,
  });
}

export function useGetMessages(gameId: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["messages", gameId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMessages(gameId, BigInt(0), BigInt(200));
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      message,
      gameId,
    }: {
      message: string;
      gameId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.sendMessage(message, gameId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.gameId.toString()],
      });
    },
  });
}

export function useSaveGame() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      players,
      frames,
      totalScores,
    }: {
      players: Player[];
      frames: Frame[][];
      totalScores: bigint[];
    }) => {
      if (!actor) throw new Error("Actor not available");

      const updatedPlayers = players.map((player, playerIndex) => {
        const playerFrames = frames[playerIndex];
        let strikes = 0;
        let spares = 0;

        playerFrames.forEach((frame, frameIndex) => {
          const roll1 = Number(frame.roll1);
          const roll2 = Number(frame.roll2);

          if (frameIndex < 9) {
            if (roll1 === 10) {
              strikes++;
            } else if (roll1 + roll2 === 10) {
              spares++;
            }
          } else {
            if (roll1 === 10) strikes++;
            if (roll1 !== 10 && roll1 + roll2 === 10) spares++;
            if (roll1 === 10 && Number(frame.roll2 || 0) === 10) strikes++;
            if (
              roll1 === 10 &&
              Number(frame.roll2 || 0) !== 10 &&
              Number(frame.roll2 || 0) + Number(frame.roll3 || 0) === 10
            )
              spares++;
          }
        });

        const currentScore = Number(totalScores[playerIndex]);

        return {
          ...player,
          totalStrikes: BigInt(strikes),
          totalSpares: BigInt(spares),
          totalPoints: BigInt(currentScore),
          highestScore: BigInt(currentScore),
          gamesPlayed: BigInt(1),
        };
      });

      const gameId = await actor.saveGame(
        updatedPlayers,
        frames,
        totalScores,
      );

      if (identity) {
        const userPrincipal = identity.getPrincipal();
        const userProfile = await actor.getUserProfile(userPrincipal);
        const userDisplayName = userProfile?.displayName;
        const userPlayerIndex = userDisplayName
          ? updatedPlayers.findIndex((p) => p.name === userDisplayName)
          : -1;

        if (userPlayerIndex >= 0) {
          const userPlayer = updatedPlayers[userPlayerIndex];
          const strikes = Number(userPlayer.totalStrikes);
          const spares = Number(userPlayer.totalSpares);

          try {
            const actorWithTokens = actor as any;

            if (strikes > 0 && actorWithTokens.awardTokens) {
              await actorWithTokens.awardTokens(
                userPrincipal,
                BigInt(strikes * 10),
                "Strike bonus",
              );
            }

            if (spares > 0 && actorWithTokens.awardTokens) {
              await actorWithTokens.awardTokens(
                userPrincipal,
                BigInt(spares * 5),
                "Spare bonus",
              );
            }

            if (actorWithTokens.awardTokens) {
              await actorWithTokens.awardTokens(
                userPrincipal,
                BigInt(25),
                "Game completion bonus",
              );
            }
          } catch (_error) {
            console.log(
              "Token rewards not available - backend token system not yet implemented",
            );
          }
        }
      }

      if (identity) {
        const userPrincipal = identity.getPrincipal();
        const existingProfile = await actor.getUserProfile(userPrincipal);

        if (existingProfile) {
          const [historyResults, currentGame] = await Promise.all([
            Promise.all(existingProfile.games.map((id) => actor.getGame(id))),
            actor.getGame(gameId),
          ]);
          const allUserGames: Game[] = [
            ...historyResults.filter((g): g is Game => g !== null && g !== undefined),
            ...(currentGame ? [currentGame] : []),
          ];

          let totalStrikes = 0;
          let totalSpares = 0;
          let totalPoints = 0;
          let highestScore = 0;
          const allScores: number[] = [];

          for (const game of allUserGames) {
            const userPlayerIndex = game.players.findIndex(
              (_p) => game.owner?.toString() === userPrincipal.toString(),
            );

            if (userPlayerIndex >= 0) {
              const userScore = Number(game.totalScores[userPlayerIndex]);
              allScores.push(userScore);
              totalPoints += userScore;
              highestScore = Math.max(highestScore, userScore);

              const playerFrames = game.frames[userPlayerIndex];
              for (
                let frameIndex = 0;
                frameIndex < playerFrames.length;
                frameIndex++
              ) {
                const frame = playerFrames[frameIndex];
                const roll1 = Number(frame.roll1);
                const roll2 = Number(frame.roll2);

                if (frameIndex < 9) {
                  if (roll1 === 10) {
                    totalStrikes++;
                  } else if (roll1 + roll2 === 10) {
                    totalSpares++;
                  }
                } else {
                  if (roll1 === 10) totalStrikes++;
                  if (roll1 !== 10 && roll1 + roll2 === 10) totalSpares++;
                  if (roll1 === 10 && Number(frame.roll2 || 0) === 10)
                    totalStrikes++;
                  if (
                    roll1 === 10 &&
                    Number(frame.roll2 || 0) !== 10 &&
                    Number(frame.roll2 || 0) + Number(frame.roll3 || 0) === 10
                  )
                    totalSpares++;
                }
              }
            }
          }

          const _averageScore =
            allScores.length > 0
              ? Math.round(totalPoints / allScores.length)
              : 0;

          await actor.updateCallerUserProfileStats(
            BigInt(totalSpares),
            BigInt(totalStrikes),
            BigInt(totalPoints),
            BigInt(highestScore),
            BigInt(allUserGames.length),
          );
        }
      }

      return gameId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["playerStats"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["globalLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["userGames"] });
      queryClient.invalidateQueries({ queryKey: ["tokenBalance"] });
      queryClient.invalidateQueries({ queryKey: ["tokenTransactions"] });
    },
  });
}

export function useUpdateAchievements() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      achievements,
    }: {
      achievements: string[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateCallerAchievements(achievements);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

export function useUpdateUserProfileStats() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      totalSpares,
      totalStrikes,
      totalPoints,
      highestScore,
      gamesPlayed,
    }: {
      totalSpares: bigint;
      totalStrikes: bigint;
      totalPoints: bigint;
      highestScore: bigint;
      gamesPlayed: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateCallerUserProfileStats(
        totalSpares,
        totalStrikes,
        totalPoints,
        highestScore,
        gamesPlayed,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["globalLeaderboard"] });
    },
  });
}

export function useUpdateProfilePicture() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      picturePath,
    }: {
      picturePath: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateCallerProfilePicture(picturePath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

export function useGetAllTeams() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTeams(BigInt(0), BigInt(100));
    },
    enabled: !!actor && !isFetching,
    staleTime: 2 * 60_000,
  });
}

export function useGetTeam(teamId?: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["team", teamId?.toString()],
    queryFn: async () => {
      if (!actor || !teamId) return null;
      return actor.getTeam(teamId);
    },
    enabled: !!actor && !isFetching && !!teamId,
  });
}

export function useGetUserTeams(principal?: Principal) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["userTeams", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return [];
      const allTeams = await actor.getAllTeams(BigInt(0), BigInt(100));
      return allTeams.filter((team) =>
        team.members.some(
          (member) => member.toString() === principal.toString(),
        ),
      );
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

export function useCreateTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
    }: {
      name: string;
      description: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createTeam(name, description);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["userTeams"] });
    },
  });
}

export function useJoinTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
    }: {
      teamId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.requestToJoinTeam(teamId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["userTeams"] });
    },
  });
}

export function useLeaveTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
    }: {
      teamId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.leaveTeam(teamId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["userTeams"] });
    },
  });
}

export function useGetJoinRequests() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["joinRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getJoinRequests(BigInt(0), BigInt(100));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRequestToJoinTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
    }: {
      teamId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.requestToJoinTeam(teamId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["joinRequests"] });
    },
  });
}

export function useApproveJoinRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      requester,
    }: {
      teamId: bigint;
      requester: Principal;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.approveJoinRequest(teamId, requester);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["userTeams"] });
      queryClient.invalidateQueries({ queryKey: ["joinRequests"] });
    },
  });
}

export function useDenyJoinRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      requester,
    }: {
      teamId: bigint;
      requester: Principal;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.denyJoinRequest(teamId, requester);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["joinRequests"] });
    },
  });
}

export function useGetInvitations() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInvitations(BigInt(0), BigInt(100));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useInviteToTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      invitee,
    }: {
      teamId: bigint;
      invitee: Principal;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.inviteToTeam(teamId, invitee);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useAcceptInvitation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
    }: {
      teamId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.acceptInvitation(teamId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["userTeams"] });
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useDeclineInvitation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
    }: {
      teamId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.declineInvitation(teamId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({ queryKey: ["allUserProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["globalLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

export function useGetAllUserProfiles() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["allUserProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUserProfiles(BigInt(0), BigInt(100));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["isAdmin", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["userRole", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return UserRole.guest;
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useAssignUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user,
      role,
    }: {
      user: Principal;
      role: UserRole;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.assignCallerUserRole(user, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userRole"] });
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
    },
  });
}

export function useGetTokenBalance() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["tokenBalance", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return BigInt(0);
      try {
        return await actor.getUserBalance(identity.getPrincipal());
      } catch (_error) {
        return BigInt(0);
      }
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetTokenTransactions() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["tokenTransactions"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getTokenTransactions();
      } catch (_error) {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTokenAllocations() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["tokenAllocations"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const pools = await actor.getTokenPools();
        return pools;
      } catch (error) {
        console.error("Error fetching token pools:", error);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 10000,
  });
}

export function useGetDetailedAuditTrail() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["detailedAuditTrail"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const actorWithTokens = actor as any;
        if (actorWithTokens.getDetailedAuditTrail) {
          return await actorWithTokens.getDetailedAuditTrail();
        }
        return [];
      } catch (_error) {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTransferTokens() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipient,
      amount,
      note,
    }: {
      recipient: string;
      amount: bigint;
      note?: string;
    }) => {
      if (!actor || !identity)
        throw new Error("Actor not available or not authenticated");
      const actorWithTokens = actor as any;
      if (!actorWithTokens.transferTokens) {
        throw new Error(
          "STK token system not yet implemented in backend - complete 1,000,000 STK token ledger with allocations needed",
        );
      }
      return await actorWithTokens.transferTokens(recipient, amount, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokenBalance"] });
      queryClient.invalidateQueries({ queryKey: ["tokenTransactions"] });
    },
  });
}

export function useAwardTokens() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipient,
      amount,
      reason,
    }: {
      recipient: Principal;
      amount: bigint;
      reason: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const actorWithTokens = actor as any;
      if (!actorWithTokens.awardTokens) {
        throw new Error(
          "STK token system not yet implemented in backend - complete 1,000,000 STK token ledger with allocations needed",
        );
      }
      return await actorWithTokens.awardTokens(recipient, amount, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokenBalance"] });
      queryClient.invalidateQueries({ queryKey: ["tokenTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["detailedAuditTrail"] });
    },
  });
}

export function useDistributeTokens() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      category,
      amount,
      recipients,
    }: {
      category: string;
      amount: bigint;
      recipients?: Principal[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      const actorWithTokens = actor as any;
      if (!actorWithTokens.distributeTokens) {
        throw new Error(
          "STK token system not yet implemented in backend - complete 1,000,000 STK token ledger with allocations needed",
        );
      }
      return await actorWithTokens.distributeTokens(
        category,
        amount,
        recipients,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokenAllocations"] });
      queryClient.invalidateQueries({ queryKey: ["tokenBalance"] });
      queryClient.invalidateQueries({ queryKey: ["tokenTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["detailedAuditTrail"] });
    },
  });
}

export function useTransferFromPoolToUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poolName,
      recipient,
      amount,
    }: {
      poolName: string;
      recipient: string;
      amount: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.transferFromPoolToUser(poolName, recipient, amount);

      if ("ok" in result) {
        return result.ok;
      }
      throw new Error(result.err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokenAllocations"] });
      queryClient.invalidateQueries({ queryKey: ["tokenTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["poolManagementHistory"] });
      queryClient.invalidateQueries({ queryKey: ["detailedAuditTrail"] });
    },
  });
}

export function useTransferTokensBetweenPools() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourcePool,
      destinationPool,
      amount,
    }: {
      sourcePool: string;
      destinationPool: string;
      amount: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.transferTokensBetweenPools(
        sourcePool,
        destinationPool,
        amount,
      );

      // Handle Result<(), Text> type
      if ("ok" in result) {
        return result.ok;
      }
      throw new Error(result.err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokenAllocations"] });
      queryClient.invalidateQueries({ queryKey: ["tokenTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["poolManagementHistory"] });
      queryClient.invalidateQueries({ queryKey: ["detailedAuditTrail"] });
    },
  });
}

export function useAdjustPoolAllocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      poolName,
      newTotal,
    }: {
      poolName: string;
      newTotal: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.adjustPoolAllocation(poolName, newTotal);

      // Handle Result<(), Text> type
      if ("ok" in result) {
        return result.ok;
      }
      throw new Error(result.err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokenAllocations"] });
      queryClient.invalidateQueries({ queryKey: ["tokenTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["poolManagementHistory"] });
      queryClient.invalidateQueries({ queryKey: ["detailedAuditTrail"] });
    },
  });
}

export function useGetPoolManagementHistory() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["poolManagementHistory"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const result = await actor.getPoolManagementHistory();

        // Handle Result<TokenTransaction[], Text> type
        if ("ok" in result) {
          return result.ok;
        }
        console.error("Failed to fetch pool management history:", result.err);
        return [];
      } catch (error) {
        console.error("Error fetching pool management history:", error);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetICPPrice() {
  const { actor } = useActor();

  return useQuery<ICPPriceData>({
    queryKey: ["icpPrice"],
    queryFn: async (): Promise<ICPPriceData> => {
      // Always try backend first for live pricing via HTTPS outcalls
      if (actor) {
        try {
          const priceResponse = await actor.fetchIcpPrice("coingecko");
          const priceData = JSON.parse(priceResponse);

          if (priceData?.["internet-computer"]?.usd) {
            const price = priceData["internet-computer"].usd;
            const change24h =
              priceData["internet-computer"].usd_24h_change || 0;

            // Update backend price feed
            await actor.updatePriceFeed(
              "CoinGecko",
              BigInt(Math.floor(price * 100)),
              "live",
            );

            return {
              price,
              change24h,
              lastUpdated: Date.now(),
              source: "CoinGecko (Backend HTTPS Outcall)",
              status: "live",
            };
          }
        } catch (error) {
          console.warn(
            "Backend CoinGecko price fetch failed, trying fallback sources:",
            error,
          );
        }

        // Try backend fallback sources via HTTPS outcalls
        const backupSources = [
          "binance",
          "coinbase",
          "kraken",
          "coinmarketcap",
        ];

        for (const source of backupSources) {
          try {
            const response = await actor.fetchIcpPrice(source);
            const data = JSON.parse(response);

            let price = 0;
            if (source === "binance" && data.lastPrice) {
              price = Number.parseFloat(data.lastPrice);
            } else if (source === "coinbase" && data.data?.amount) {
              price = Number.parseFloat(data.data.amount);
            } else if (source === "kraken" && data.result?.ICPUSD?.c?.[0]) {
              price = Number.parseFloat(data.result.ICPUSD.c[0]);
            } else if (
              source === "coinmarketcap" &&
              data.data?.ICP?.quote?.USD?.price
            ) {
              price = Number.parseFloat(data.data.ICP.quote.USD.price);
            }

            if (price > 0) {
              await actor.updatePriceFeed(
                source,
                BigInt(Math.floor(price * 100)),
                "live",
              );

              return {
                price,
                change24h: 0,
                lastUpdated: Date.now(),
                source: `${source} (Backend HTTPS Outcall)`,
                status: "live",
              };
            }
          } catch (error) {
            console.warn(`Backend ${source} price fetch failed:`, error);
          }
        }
      }

      // Fallback to client-side fetching
      return await fetchClientSidePrice();
    },
    refetchInterval: 30000, // Refresh every 30 seconds for live pricing
    staleTime: 15000, // Consider data stale after 15 seconds
    retry: 3,
  });
}

async function fetchClientSidePrice(): Promise<ICPPriceData> {
  const dataSources = [
    {
      name: "CoinGecko",
      url: "https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd&include_24hr_change=true",
      parser: (data: any) => ({
        price: data["internet-computer"]?.usd || 0,
        change24h: data["internet-computer"]?.usd_24h_change || 0,
      }),
    },
    {
      name: "Binance",
      url: "https://api.binance.com/api/v3/ticker/24hr?symbol=ICPUSDT",
      parser: (data: any) => ({
        price: Number.parseFloat(data?.lastPrice || "0"),
        change24h: Number.parseFloat(data?.priceChangePercent || "0"),
      }),
    },
  ];

  for (const source of dataSources) {
    try {
      const response = await fetch(source.url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Strike-Tracker-App/1.0",
        },
      });

      if (!response.ok) continue;

      const data = await response.json();
      const parsed = source.parser(data);

      if (parsed.price > 0) {
        const priceData: ICPPriceData = {
          price: parsed.price,
          change24h: parsed.change24h,
          lastUpdated: Date.now(),
          source: source.name,
          status: "live",
        };

        // Cache the live price
        localStorage.setItem(
          "lastICPPrice",
          JSON.stringify({
            price: priceData.price,
            change24h: priceData.change24h,
            lastUpdated: priceData.lastUpdated,
          }),
        );

        return priceData;
      }
    } catch (error) {
      console.warn(`Failed to fetch ICP price from ${source.name}:`, error);
    }
  }

  // Use cached price if available
  const cachedPrice = localStorage.getItem("lastICPPrice");
  if (cachedPrice) {
    const cached = JSON.parse(cachedPrice);
    return {
      price: cached.price || 0,
      change24h: cached.change24h || 0,
      lastUpdated: cached.lastUpdated || Date.now(),
      source: "Cached",
      status: "cached",
    };
  }

  // NO HARDCODED FALLBACK - throw error to enforce live pricing requirement
  throw new Error(
    "Unable to fetch live ICP price from any oracle source. Live pricing is mandatory for STK token minting operations. Please check your internet connection and try again.",
  );
}

export function useGetICPPriceHistory() {
  return useQuery({
    queryKey: ["icpPriceHistory"],
    queryFn: async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/coins/internet-computer/market_chart?vs_currency=usd&days=7&interval=hourly",
        );

        if (!response.ok) throw new Error("Failed to fetch price history");

        const data = await response.json();
        return (
          data.prices?.map(([timestamp, price]: [number, number]) => ({
            timestamp,
            price,
            date: new Date(timestamp).toISOString(),
          })) || []
        );
      } catch (error) {
        console.warn("Failed to fetch ICP price history:", error);
        return [];
      }
    },
    refetchInterval: 300000,
    staleTime: 240000,
  });
}

export function useGetPurchaseHistory() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["purchaseHistory", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return [];
      try {
        const allPayments = await actor.getPaymentTransactions();
        return allPayments.filter(
          (payment: PaymentTransaction) =>
            payment.user.toString() === identity.getPrincipal().toString(),
        );
      } catch (_error) {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useVerifyIcpPayment() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ accountId }: { accountId: string }) => {
      if (!actor) throw new Error("Actor not available");

      // Validate Account ID is 64 hex characters (32 bytes)
      if (!/^[0-9a-f]{64}$/i.test(accountId)) {
        throw new Error(
          "Invalid Account ID format: expected 64 hex characters.",
        );
      }

      const result = await actor.verifyIcpPayment(accountId);

      // Handle Result<Nat, Text> type
      if ("ok" in result) {
        return result.ok;
      }
      throw new Error(result.err);
    },
  });
}

export function useMintStkTokens() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      icpAmount,
      stkAmount,
      exchangeRate,
      adminTreasuryAddress,
      onProgress,
    }: {
      icpAmount: bigint;
      stkAmount: bigint;
      exchangeRate: bigint;
      adminTreasuryAddress: string;
      onProgress?: (step: 1 | 2) => void;
    }) => {
      if (!identity)
        throw new Error("Not authenticated — please sign in first");
      if (!actor) throw new Error("Actor not available");

      if (
        !adminTreasuryAddress ||
        !/^[0-9a-f]{64}$/i.test(adminTreasuryAddress)
      ) {
        throw new Error(
          "Minting is not available — admin treasury not configured. Contact the admin.",
        );
      }

      // Guard: all three amounts must be defined and > 0 before submitting any on-chain tx
      if (icpAmount === undefined || icpAmount === null) {
        throw new Error(
          "Missing required value: icpAmount must be a valid amount",
        );
      }
      if (icpAmount <= 0n) {
        throw new Error(
          "Missing required value: icpAmount must be greater than zero",
        );
      }
      if (stkAmount === undefined || stkAmount === null) {
        throw new Error(
          "Missing required value: stkAmount must be a valid amount",
        );
      }
      if (stkAmount <= 0n) {
        throw new Error(
          "Missing required value: stkAmount must be greater than zero",
        );
      }
      if (exchangeRate === undefined || exchangeRate === null) {
        throw new Error(
          "Missing required value: exchangeRate must be a valid amount",
        );
      }
      if (exchangeRate <= 0n) {
        throw new Error(
          "Missing required value: exchangeRate must be greater than zero",
        );
      }

      // Step 1: Transfer ICP from user's personal account to admin treasury
      // This is a REAL on-chain transfer signed by the user's Internet Identity
      onProgress?.(1);
      const blockHeight = await sendIcpViaLedger(
        identity,
        adminTreasuryAddress,
        icpAmount,
      );

      // Guard: sendIcpViaLedger must return a valid block height before we credit STK
      if (blockHeight === undefined || blockHeight === null) {
        throw new Error(
          "ICP transfer did not return a block height — cannot confirm payment",
        );
      }
      // Coerce to bigint at runtime — Nat64 from @dfinity/agent should already be bigint,
      // but this guards against any edge-case where it comes back as number/string.
      const blockHeightBigInt = BigInt(blockHeight as bigint);
      if (typeof blockHeightBigInt !== "bigint") {
        throw new Error(`Invalid block height type: ${typeof blockHeight}`);
      }

      // Step 2: Call backend to record the payment and credit STK tokens
      // The backend validates the block height for audit purposes
      onProgress?.(2);
      const result = await actor.mintStkTokens(
        icpAmount,
        stkAmount,
        exchangeRate,
        blockHeightBigInt,
      );

      if ("ok" in result) {
        return { blockHeight };
      }
      // ICP was sent but backend failed to credit STK — critical error
      const errMsg = (result as { err: string }).err ?? "STK crediting failed";
      throw new Error(
        `ICP was sent (block ${blockHeight}) but STK crediting failed: ${errMsg}. Please contact support with this block height.`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokenAllocations"] });
      queryClient.invalidateQueries({ queryKey: ["tokenTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseHistory"] });
      queryClient.invalidateQueries({ queryKey: ["detailedAuditTrail"] });
      queryClient.invalidateQueries({ queryKey: ["callerWallet"] });
      queryClient.invalidateQueries({ queryKey: ["callerWalletSummary"] });
      queryClient.invalidateQueries({ queryKey: ["callerIcpBalance"] });
      queryClient.invalidateQueries({ queryKey: ["tokenBalance"] });
    },
  });
}

export function useGetPriceFeeds() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["priceFeeds"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getPriceFeeds();
      } catch (_error) {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60000,
  });
}

export function useGetMarketDataStatus() {
  const { data: icpPrice } = useGetICPPrice();
  const { data: priceHistory } = useGetICPPriceHistory();
  const { data: priceFeeds } = useGetPriceFeeds();

  return useQuery({
    queryKey: ["marketDataStatus"],
    queryFn: async () => {
      const now = Date.now();
      const priceAge = icpPrice
        ? now - icpPrice.lastUpdated
        : Number.POSITIVE_INFINITY;

      return {
        priceStatus: icpPrice?.status || "unknown",
        priceSource: icpPrice?.source || "unknown",
        priceAge: priceAge,
        isLive: priceAge < 60000,
        currentPrice: icpPrice?.price || 0,
        change24h: icpPrice?.change24h || 0,
        historyPoints: priceHistory?.length || 0,
        lastUpdate: icpPrice?.lastUpdated || 0,
        backendFeeds: priceFeeds?.length || 0,
        healthScore: calculateHealthScore(
          icpPrice,
          priceHistory,
          priceAge,
          priceFeeds,
        ),
      };
    },
    enabled: true,
    refetchInterval: 10000,
  });
}

function calculateHealthScore(
  priceData?: ICPPriceData,
  historyData?: any[],
  priceAge?: number,
  priceFeeds?: PriceFeed[],
): number {
  let score = 0;

  if (priceData?.status === "live") score += 30;
  else if (priceData?.status === "cached") score += 15;

  if (priceAge && priceAge < 30000) score += 25;
  else if (priceAge && priceAge < 60000) score += 20;
  else if (priceAge && priceAge < 300000) score += 10;

  if (historyData && historyData.length > 100) score += 20;
  else if (historyData && historyData.length > 50) score += 15;
  else if (historyData && historyData.length > 0) score += 10;

  if (priceFeeds && priceFeeds.length > 3) score += 15;
  else if (priceFeeds && priceFeeds.length > 1) score += 10;
  else if (priceFeeds && priceFeeds.length > 0) score += 5;

  if (priceData?.source?.includes("Backend")) score += 10;
  else if (priceData?.source === "CoinGecko" || priceData?.source === "Binance")
    score += 8;
  else if (priceData?.source === "Cached") score += 3;

  return Math.min(score, 100);
}

// Wallet Management Hooks - ICP balances fetched live via Nat64, STK balances from wallet state
export function useGetCallerWallet() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["callerWallet", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return null;
      try {
        return await actor.getCallerWallet();
      } catch (_error) {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetCallerIcpBalance() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["callerIcpBalance", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return BigInt(0);
      try {
        const principal = identity.getPrincipal();
        const accountId = principalToAccountIdSync(principal);

        if (!/^[0-9a-f]{64}$/i.test(accountId)) {
          console.error("Invalid Account ID format:", accountId);
          return BigInt(0);
        }

        const result = await actor.getCallerIcpBalance(accountId);

        // Handle Result<Nat, Text> type
        if ("ok" in result) {
          return result.ok;
        }
        console.error("Failed to fetch ICP balance:", result.err);
        return BigInt(0);
      } catch (error) {
        console.error("Failed to fetch ICP balance:", error);
        return BigInt(0);
      }
    },
    enabled: !!actor && !isFetching && !!identity,
    refetchInterval: 10000, // Refresh every 10 seconds for live balance
  });
}

export function useInitializeWallet() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      icpAccountId,
      stkPrincipalId,
    }: {
      icpAccountId: string;
      stkPrincipalId: string;
    }) => {
      if (!actor) throw new Error("Actor not available");

      // Validate ICP Account ID is 64 hex characters (32 bytes)
      if (!/^[0-9a-f]{64}$/i.test(icpAccountId)) {
        throw new Error(
          "Invalid ICP Account ID format. Expected 64 hexadecimal characters.",
        );
      }

      const result = await actor.initializeWallet(icpAccountId, stkPrincipalId);

      // Handle Result<(), Text> type
      if ("ok" in result) {
        return result.ok;
      }
      throw new Error(result.err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerWallet"] });
      queryClient.invalidateQueries({ queryKey: ["callerIcpBalance"] });
    },
  });
}

export function useSendIcpTokens() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipientAccountId,
      amount,
    }: {
      recipientAccountId: string;
      amount: bigint;
    }) => {
      if (!identity)
        throw new Error("Not authenticated — please sign in first");
      if (!actor) throw new Error("Actor not available");

      // Validate recipient Account ID format (64 hex chars)
      if (!/^[0-9a-f]{64}$/i.test(recipientAccountId)) {
        throw new Error(
          "Invalid recipient Account ID format. Expected 64 hexadecimal characters.",
        );
      }

      // Minimum amount check: must be > network fee (10000 e8s = 0.0001 ICP)
      if (amount <= BigInt(10000)) {
        throw new Error(
          "Amount too small. Minimum send is 0.0001 ICP (10000 e8s) to cover network fees.",
        );
      }

      // Step 1: Submit the transfer directly via the user's Internet Identity
      // The canister CANNOT sign for the user's personal account — only the user can
      const blockHeight = await sendIcpViaLedger(
        identity,
        recipientAccountId,
        amount,
      );

      // Step 2: Record the transaction in the backend for history/display
      try {
        await actor.recordIcpSend(recipientAccountId, amount, blockHeight);
      } catch (recordErr) {
        // Recording failure is non-fatal — the on-chain transfer already succeeded
        console.warn("Failed to record ICP send in backend:", recordErr);
      }

      return blockHeight;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerWallet"] });
      queryClient.invalidateQueries({ queryKey: ["callerIcpBalance"] });
      queryClient.invalidateQueries({ queryKey: ["callerWalletSummary"] });
      queryClient.invalidateQueries({ queryKey: ["userIcpDepositBalance"] });
    },
  });
}

// ── Secure Two-Step Minting Hooks ───────────────────────────────────────────

/**
 * Returns the caller's personal deposit address for minting.
 * This is the account ID derived from their principal (via the backend's
 * getCallerDerivedAccountId) — kept for potential future use.
 * @deprecated Use the wallet's personal ICP account ID instead.
 */

/**
 * Returns the admin treasury ICP wallet address (where minting payments go).
 * Uses the existing getAdminIcpWallet backend method.
 */
export function useGetAdminTreasuryAddress() {
  const { actor, isFetching } = useActor();

  return useQuery<string | null>({
    queryKey: ["adminTreasuryAddress"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return (await actor.getAdminIcpWallet()) ?? null;
      } catch (_error) {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 60000,
  });
}

export function useGetAdminIcpWallet() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["adminIcpWallet"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const result = await actor.getAdminIcpWallet();
        return result ?? null;
      } catch (_error) {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetAdminIcpWallet() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ address }: { address: string }) => {
      if (!actor) throw new Error("Actor not available");
      if (!/^[0-9a-f]{64}$/i.test(address)) {
        throw new Error(
          "Invalid ICP account ID format. Expected 64 hexadecimal characters.",
        );
      }
      const result = await actor.setAdminIcpWallet(address);
      if ("ok" in result) return result.ok;
      throw new Error(result.err ?? "Failed to set admin wallet");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminIcpWallet"] });
    },
  });
}

export function useSetLedgerPrincipal() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ principalText }: { principalText: string }) => {
      if (!actor) throw new Error("Actor not available");
      const { Principal } = await import("@dfinity/principal");
      const principal = Principal.fromText(principalText);
      const result = await actor.setLedgerPrincipal(principal);
      if ("ok" in result) {
        return result.ok;
      }
      throw new Error(result.err);
    },
  });
}

export function useInitializeAccessControl() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.initializeAccessControl();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userRole"] });
    },
  });
}

/**
 * Calls loginUser() on the backend after the user authenticates via Internet
 * Identity. The first caller becomes admin; all subsequent callers get user role.
 * Must be called once per session after authentication.
 */
export function useLoginUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.loginUser();
      if ("ok" in result) return result.ok;
      if ("err" in result && typeof result.err === "string") {
        // "already registered" and "not yet initialized" are both non-fatal:
        // - "already": returning user who already has a role
        // - "not yet initialized": admin hasn't called initializeAccessControl yet
        //   (happens on first admin visit since both calls are concurrent)
        const msg = result.err.toLowerCase();
        if (msg.includes("already") || msg.includes("not yet initialized")) {
          return null;
        }
        throw new Error(result.err);
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["userRole"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useSendStkTokens() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipient,
      amount,
    }: {
      recipient: string;
      amount: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");

      const result = await actor.sendStkTokens(recipient, amount);

      // Handle Result<(), Text> type
      if ("ok" in result) {
        return result.ok;
      }
      throw new Error(result.err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerWallet"] });
    },
  });
}
