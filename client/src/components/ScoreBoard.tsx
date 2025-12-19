import { useScores } from "@/hooks/use-scores";
import { Trophy, Medal, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ScoreBoard() {
  const { data: scores, isLoading } = useScores();

  // Sort scores descending
  const sortedScores = scores?.sort((a, b) => b.score - a.score).slice(0, 10) || [];

  if (isLoading) {
    return <ScoreBoardSkeleton />;
  }

  return (
    <div className="w-full max-w-md bg-card/50 backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white font-display">Leaderboard</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Top Runners</p>
        </div>
      </div>

      <div className="space-y-3">
        {sortedScores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No scores yet. Be the first!
          </div>
        ) : (
          sortedScores.map((score, index) => (
            <div 
              key={score.id}
              className={`
                relative flex items-center justify-between p-4 rounded-xl transition-all duration-300
                ${index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-500/30' : 'bg-white/5 hover:bg-white/10 border border-transparent'}
              `}
            >
              <div className="flex items-center gap-4">
                <div className={`
                  w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm
                  ${index === 0 ? 'bg-yellow-500 text-black' : 
                    index === 1 ? 'bg-slate-300 text-slate-900' : 
                    index === 2 ? 'bg-orange-700 text-orange-100' : 'bg-white/10 text-white/60'}
                `}>
                  {index + 1}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white">
                    {score.playerName}
                    {index === 0 && <Crown className="inline-block w-3 h-3 ml-2 text-yellow-500 mb-1" />}
                  </span>
                </div>
              </div>
              
              <div className="font-mono text-xl font-bold text-primary">
                {score.score.toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ScoreBoardSkeleton() {
  return (
    <div className="w-full max-w-md bg-card/50 backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="w-12 h-12 rounded-xl bg-white/10" />
        <div className="space-y-2">
          <Skeleton className="w-32 h-6 bg-white/10" />
          <Skeleton className="w-20 h-3 bg-white/10" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="w-full h-16 rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
