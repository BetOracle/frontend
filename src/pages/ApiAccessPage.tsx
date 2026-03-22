import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Copy, Eye, EyeOff, RefreshCw, ExternalLink, Key, Shield, BookOpen, Code } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const endpoints = [
  {
    method: 'GET',
    path: '/predictions/upcoming',
    desc: 'Get all upcoming predictions',
    example: '{\n  "predictions": [\n    {\n      "id": "pred-001",\n      "match": "Arsenal vs Chelsea",\n      "outcome": "home_win",\n      "confidence": 78\n    }\n  ]\n}',
  },
  {
    method: 'GET',
    path: '/predictions/:id',
    desc: 'Get prediction by ID',
    example: '{\n  "id": "pred-001",\n  "match": { ... },\n  "prediction": { ... },\n  "modelFactors": [ ... ]\n}',
  },
  {
    method: 'GET',
    path: '/stats',
    desc: 'Get overall stats',
    example: '{\n  "totalPredictions": 45,\n  "winRate": 67,\n  "avgConfidence": 71\n}',
  },
  {
    method: 'GET',
    path: '/history',
    desc: 'Get historical predictions',
    example: '{\n  "predictions": [ ... ],\n  "pagination": { "page": 1, "total": 45 }\n}',
  },
];

export default function ApiAccessPage() {
  const { walletConnected, tier } = useStore();
  const navigate = useNavigate();
  const [showKey, setShowKey] = useState(false);
  const [expandedEndpoint, setExpandedEndpoint] = useState<number | null>(null);
  const isGold = tier === 'gold';

  if (!walletConnected || !isGold) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex p-4 rounded-2xl bg-gold/10 text-gold mb-6">
            <Key size={48} />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Gold Tier Required</h1>
          <p className="text-muted-foreground mb-8">
            API access is restricted to Gold tier.
          </p>
          <Button onClick={() => navigate('/token')} className="gradient-primary text-primary-foreground">
            View Token Info
          </Button>
        </motion.div>
      </div>
    );
  }

  const copyKey = () => {
    toast({ title: 'Unavailable', description: 'API key issuance is not available from the backend yet.' });
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-2">API Access</h1>
          <p className="text-muted-foreground mt-2">Integrate BetOracle's predictive model directly into your own applications.</p>

        {/* API Key */}
        <Card className="p-6 bg-card border-border mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Key size={16} className="text-gold" />
              Your API Key
            </h3>
            <Badge className="bg-gold/15 text-gold border-gold/30">Gold</Badge>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 text-sm font-mono bg-background p-3 rounded border border-border text-muted-foreground">
              {'Not available'}
            </code>
            <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)} className="h-10 w-10 shrink-0">
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={copyKey} className="h-10 w-10 shrink-0">
              <Copy size={16} />
            </Button>
          </div>

          <Button variant="outline" size="sm" className="border-border" disabled>
            <RefreshCw size={14} className="mr-2" />
            Regenerate Key
          </Button>

          <div className="mt-3 p-3 rounded bg-warning/10 border border-warning/20">
            <p className="text-xs text-warning flex items-center gap-1">
              <Shield size={12} />
              Keep your API key secret. Never expose it in client-side code.
            </p>
          </div>
        </Card>

        {/* Usage */}
        <Card className="p-6 bg-card border-border mb-6">
          <h3 className="font-semibold text-foreground mb-4">Usage</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">2,847 / 10,000 requests today</span>
            <span className="text-sm font-mono text-foreground">28.5%</span>
          </div>
          <Progress value={28.5} className="h-2" />
        </Card>

        {/* Documentation */}
        <Card className="p-6 bg-card border-border mb-6">
          <h3 className="font-semibold text-foreground mb-4">Quick Start</h3>

          <div className="mb-4 p-3 rounded bg-background border border-border">
            <p className="text-xs text-muted-foreground mb-1">Base URL</p>
            <code className="text-sm font-mono text-primary">https://api.footyoracle.com/v1</code>
          </div>

          <div className="mb-6 p-3 rounded bg-background border border-border">
            <p className="text-xs text-muted-foreground mb-1">Authentication</p>
            <code className="text-sm font-mono text-foreground">Authorization: Bearer {'<your_api_key>'}</code>
          </div>

          <h4 className="font-medium text-foreground mb-3">Endpoints</h4>
          <div className="space-y-2">
            {endpoints.map((ep, i) => (
              <div key={i} className="border border-border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/30 transition-colors"
                  onClick={() => setExpandedEndpoint(expandedEndpoint === i ? null : i)}
                >
                  <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/30 shrink-0">
                    {ep.method}
                  </Badge>
                  <code className="text-sm font-mono text-foreground">{ep.path}</code>
                  <span className="ml-auto text-xs text-muted-foreground">{ep.desc}</span>
                </button>
                {expandedEndpoint === i && (
                  <div className="border-t border-border p-3 bg-background">
                    <p className="text-xs text-muted-foreground mb-2">Example Response:</p>
                    <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{ep.example}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-4 bg-card border-border hover:border-primary/20 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-primary" />
              <div>
                <p className="font-medium text-foreground text-sm">Full Documentation</p>
                <p className="text-xs text-muted-foreground">Complete API reference</p>
              </div>
              <ExternalLink size={14} className="ml-auto text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4 bg-card border-border hover:border-primary/20 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <Code size={20} className="text-primary" />
              <div>
                <p className="font-medium text-foreground text-sm">Code Examples</p>
                <p className="text-xs text-muted-foreground">GitHub repository</p>
              </div>
              <ExternalLink size={14} className="ml-auto text-muted-foreground" />
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
