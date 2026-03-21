import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Brain, Scale, ShieldCheck, ArrowRight, ArrowDown } from 'lucide-react';

const steps = [
  {
    icon: <Brain size={28} />,
    title: '1. AI Analysis',
    description: 'The BetOracle agent continuously evaluates match data to assess True Form, Head-to-Head trends, Injury severity, and precise League Position impacts. This 6-factor model calculates the real probability of each outcome independent of the odds.',
  },
  {
    icon: <Scale size={28} />,
    title: '2. Edge Detection',
    description: 'The model compares its computed true probabilities against the real-time implied probabilities from market odds. It actively hunts for inefficiencies where the market underprices an outcome.',
  },
  {
    icon: <ShieldCheck size={28} />,
    title: '3. Value Picks & On-Chain Recording',
    description: 'The agent only surfaces picks that possess an 8%+ edge over the market. Once identified, the prediction is immutably recorded via smart contract on the Celo blockchain prior to kickoff.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-20 min-h-screen">
      {/* Header */}
      <motion.div
        className="text-center max-w-2xl mx-auto mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
          How <span className="gradient-text">BetOracle</span> Works
        </h1>
        <p className="text-lg text-muted-foreground">
          Autonomous Value Betting on the Celo Blockchain
        </p>
      </motion.div>

      {/* Visual Flow Diagram & 3-Step Explainer */}
      <div className="max-w-4xl mx-auto mb-16 relative">
        <div className="hidden md:block absolute left-[50%] top-16 bottom-16 w-1 bg-gradient-to-b from-primary/50 via-secondary/50 to-primary/50 -translate-x-1/2 rounded-full" />
        
        <div className="space-y-12">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
              className={`flex flex-col md:flex-row items-center gap-8 ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}
            >
              {/* Box */}
              <div className="flex-1 w-full relative z-10">
                <div className="p-8 rounded-2xl glass-card border border-white/10 hover:border-primary/30 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />
                  <div className="flex items-start gap-5 relative z-10">
                    <div className="w-14 h-14 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner border border-primary/20">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Node (Desktop) */}
              <div className="hidden md:flex w-12 items-center justify-center relative z-10">
                <div className="w-4 h-4 rounded-full bg-primary ring-4 ring-primary/20" />
              </div>

              {/* Spacer */}
              <div className="flex-1 hidden md:block" />

              {/* Mobile Connector */}
              {i < steps.length - 1 && (
                <div className="md:hidden flex justify-center py-2 text-primary/40">
                  <ArrowDown size={24} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <motion.div
        className="text-center mt-20 pt-12 border-t border-white/5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-foreground mb-4">Ready to get the Edge?</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          View today's value bets or check out our transparent track record on Celo.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="gradient-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 px-8">
            <Link to="/dashboard">
              View Today's Picks
              <ArrowRight size={16} className="ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white/10 glass-card">
            <Link to="/track-record">View Track Record</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
