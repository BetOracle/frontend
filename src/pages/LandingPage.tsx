import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { Target, BarChart3, Database, ShieldCheck, ArrowRight, Wallet } from 'lucide-react';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { thirdwebClient, celoChain } from '@/config/thirdweb';


export default function LandingPage() {
  const { stats } = useStore();
  const account = useActiveAccount();

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Hero Section */}
      <section className="relative px-4 py-24 md:py-32 flex flex-col items-center justify-center text-center overflow-hidden">
        {/* Animated Pitch Lines (CSS Only background) */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] border border-white/20 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1px] bg-white/20" />
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[150px] h-[300px] border border-white/20 border-l-0" />
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[150px] h-[300px] border border-white/20 border-r-0" />
        </div>
        
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(53,208,127,0.05)_0%,transparent_60%)] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 text-balance">
              The Only Football Predictions <br className="hidden md:block" />
              <span className="gradient-text glow">Verified On-Chain</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
              Our AI analyzes form, H2H, injuries, and table position. We only surface picks with &gt;8% edge over the market.
            </p>
          </motion.div>

          {/* Stat Counters */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-4 md:gap-8 pt-4"
          >
            <div className="glass-card px-6 py-4 rounded-2xl border-white/10 flex flex-col items-center min-w[140px]">
              <span className="text-3xl font-bold font-mono text-primary">{stats.winRate}%</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1 flex items-center gap-1"><Target size={12}/> Win Rate</span>
            </div>
            <div className="glass-card px-6 py-4 rounded-2xl border-white/10 flex flex-col items-center min-w[140px]">
               <span className="text-3xl font-bold font-mono text-foreground">{stats.totalPredictions}</span>
               <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1 flex items-center gap-1"><Database size={12}/> Predictions</span>
            </div>
            <div className="glass-card px-6 py-4 rounded-2xl border-primary/20 bg-primary/5 flex flex-col items-center min-w[140px]">
               <span className="text-3xl font-bold font-mono text-success">100%</span>
               <span className="text-xs text-success uppercase tracking-wider mt-1 flex items-center gap-1"><ShieldCheck size={12}/> Recorded on Celo</span>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6"
          >
            {!account?.address ? (
              <ConnectButton 
                client={thirdwebClient} 
                chain={celoChain}
                connectButton={{
                  className: "w-full sm:w-auto text-base h-14 px-8 gradient-primary text-primary-foreground font-bold shadow-lg shadow-primary/20",
                  label: "Connect Wallet"
                }}
              />

            ) : (
              <Link to="/dashboard">
                <Button className="gradient-primary text-primary-foreground font-bold px-8 py-6 text-lg">
                  View Today's Picks <ArrowRight className="ml-2" size={18} />
                </Button>
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Explanation Strip */}
      <section className="border-y border-white/5 bg-black/40 py-8 relative z-10">
         <div className="container mx-auto px-4 text-center max-w-4xl">
            <h3 className="text-lg font-medium text-foreground mb-4">How we categorize matches</h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 text-sm">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-success shrink-0 font-bold border border-success/30 shadow-[0_0_10px_rgba(53,208,127,0.3)]">✓</div>
                 <div className="text-left">
                   <p className="font-bold text-foreground">VALUE BET</p>
                   <p className="text-muted-foreground">Our model found an edge &gt;8%</p>
                 </div>
               </div>
               <div className="hidden md:block w-px h-10 bg-white/10" />
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground shrink-0 font-bold border border-white/10">✗</div>
                 <div className="text-left">
                   <p className="font-bold text-muted-foreground">NO_VALUE_BET</p>
                   <p className="text-muted-foreground">Market is fairly priced</p>
                 </div>
               </div>
            </div>
            <p className="mt-8 text-xs text-muted-foreground/60 max-w-lg mx-auto uppercase tracking-widest leading-loose">
               This absolute transparency is why we're different from every other tipster service on the internet.
            </p>
         </div>
      </section>

    </div>
  );
}
