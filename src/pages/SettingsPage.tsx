import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { TierBadge } from '@/components/TierBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Copy, ExternalLink, LogOut, Save } from 'lucide-react';
import { CELOSCAN_URL } from '@/data/mockData';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useDisconnect, useActiveWallet } from 'thirdweb/react';

export default function SettingsPage() {
  const { walletAddress, walletConnected, tier, tokenBalance } = useStore();
  const navigate = useNavigate();
  const { disconnect } = useDisconnect();
  const activeWallet = useActiveWallet();
  const isGold = tier === 'gold';

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [email, setEmail] = useState('');
  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const [leagues, setLeagues] = useState({
    premierLeague: true,
    laLiga: true,
    serieA: true,
    bundesliga: false,
    ligue1: false,
  });

  const [confidenceDisplay, setConfidenceDisplay] = useState('percentage');
  const [oddsFormat, setOddsFormat] = useState('decimal');

  if (!walletConnected) {
    navigate('/dashboard');
    return null;
  }

  const handleSave = () => {
    toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
  };

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast({ title: 'Copied', description: 'Wallet address copied' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-8">Settings</h1>

        {/* Notification Preferences */}
        <Card className="p-6 bg-card border-border mb-6">
          <h3 className="font-semibold text-foreground mb-4">Notification Preferences</h3>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Email Alerts</Label>
                <p className="text-xs text-muted-foreground">Get predictions via email</p>
              </div>
              <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
            </div>
            {emailEnabled && (
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background border-border"
              />
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Discord DMs</Label>
                <p className="text-xs text-muted-foreground">Receive alerts via Discord</p>
              </div>
              <Switch checked={discordEnabled} onCheckedChange={setDiscordEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Browser Push</Label>
                <p className="text-xs text-muted-foreground">Desktop notifications</p>
              </div>
              <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className={isGold ? 'text-foreground' : 'text-muted-foreground'}>
                  SMS Alerts {!isGold && <span className="text-xs text-gold">(Gold only)</span>}
                </Label>
                <p className="text-xs text-muted-foreground">Text message alerts</p>
              </div>
              <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} disabled={!isGold} />
            </div>
          </div>
        </Card>

        {/* League Preferences */}
        <Card className="p-6 bg-card border-border mb-6">
          <h3 className="font-semibold text-foreground mb-4">League Preferences</h3>
          <div className="space-y-3">
            {[
              { key: 'premierLeague', label: 'Premier League' },
              { key: 'laLiga', label: 'La Liga' },
              { key: 'serieA', label: 'Serie A' },
              { key: 'bundesliga', label: 'Bundesliga' },
              { key: 'ligue1', label: 'Ligue 1' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={leagues[key as keyof typeof leagues]}
                  onCheckedChange={(checked) =>
                    setLeagues(prev => ({ ...prev, [key]: !!checked }))
                  }
                />
                <Label htmlFor={key} className="text-foreground cursor-pointer">{label}</Label>
              </div>
            ))}
          </div>
          {isGold && (
            <p className="text-xs text-gold mt-3">✨ Gold tier: You can request new leagues</p>
          )}
        </Card>

        {/* Display Preferences */}
        <Card className="p-6 bg-card border-border mb-6">
          <h3 className="font-semibold text-foreground mb-4">Display Preferences</h3>
          <div className="space-y-6">
            <div>
              <Label className="text-foreground mb-2 block">Confidence Display</Label>
              <RadioGroup value={confidenceDisplay} onValueChange={setConfidenceDisplay}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="pct" />
                  <Label htmlFor="pct" className="cursor-pointer text-foreground">Percentage</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bar" id="bar" />
                  <Label htmlFor="bar" className="cursor-pointer text-foreground">Bar</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="stars" id="stars" />
                  <Label htmlFor="stars" className="cursor-pointer text-foreground">Stars</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-foreground mb-2 block">Odds Format</Label>
              <RadioGroup value={oddsFormat} onValueChange={setOddsFormat}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="decimal" id="dec" />
                  <Label htmlFor="dec" className="cursor-pointer text-foreground">Decimal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fractional" id="frac" />
                  <Label htmlFor="frac" className="cursor-pointer text-foreground">Fractional</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="american" id="amer" />
                  <Label htmlFor="amer" className="cursor-pointer text-foreground">American</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </Card>

        {/* Token Holdings */}
        <Card className="p-6 bg-card border-border mb-6">
          <h3 className="font-semibold text-foreground mb-4">Token Holdings</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance</span>
              <span className="font-mono font-semibold text-foreground">{tokenBalance.toLocaleString()} ORACLE</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">Tier</span>
              <TierBadge tier={tier} size="sm" />
            </div>
            {walletAddress && (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-muted-foreground bg-background p-2 rounded truncate">
                  {walletAddress}
                </code>
                <Button variant="ghost" size="icon" onClick={copyAddress} className="h-8 w-8 shrink-0">
                  <Copy size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => window.open(`${CELOSCAN_URL}/address/${walletAddress}`, '_blank')}
                >
                  <ExternalLink size={14} />
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Security */}
        <Card className="p-6 bg-card border-border mb-6">
          <h3 className="font-semibold text-foreground mb-4">Security</h3>
          <Button
            variant="destructive"
            onClick={() => {
              if (activeWallet) disconnect(activeWallet);
              navigate('/');
            }}
          >
            <LogOut size={14} className="mr-2" />
            Disconnect Wallet
          </Button>
        </Card>

        <Button onClick={handleSave} size="lg" className="w-full gradient-primary text-primary-foreground">
          <Save size={16} className="mr-2" />
          Save Changes
        </Button>
      </motion.div>
    </div>
  );
}
