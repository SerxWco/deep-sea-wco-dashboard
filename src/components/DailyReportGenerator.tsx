import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatExactNumber, formatExactCurrency, formatExactWCO, getChangeIndicator, formatReportChange } from '@/utils/exactFormatters';

interface ReportData {
  totalHolders: number;
  holdersChange: number;
  transactions24h: number;
  transactionsChange: number;
  wcoMoved24h: number;
  wcoMovedChange: number;
  circulatingSupply: number;
  circulatingSupplyChange: number;
  marketCap: number;
  marketCapChange: number;
  volume24h: number;
  volumeChange: number;
  wcoBurnt: number;
  wcoBurntChange: number;
}

interface DailyReportGeneratorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: ReportData | null;
}

export function DailyReportGenerator({ isOpen, onOpenChange, reportData }: DailyReportGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateReportText = (): string => {
    if (!reportData) return '';

    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `WCO Ocean Daily Update 📅 ${currentDate}

🌊 Total Holders: ${formatExactNumber(reportData.totalHolders)} ${formatReportChange(reportData.holdersChange)} ${getChangeIndicator(reportData.holdersChange)}

💱 Transactions: ${formatExactNumber(reportData.transactions24h)} ${formatReportChange(reportData.transactionsChange)} ${getChangeIndicator(reportData.transactionsChange)}

💰 Volume Moved: ${formatExactWCO(reportData.wcoMoved24h)} ${formatReportChange(reportData.wcoMovedChange)} ${getChangeIndicator(reportData.wcoMovedChange)}

🪙 Circulating Supply: ${formatExactWCO(reportData.circulatingSupply)} ${formatReportChange(reportData.circulatingSupplyChange)} ${getChangeIndicator(reportData.circulatingSupplyChange)}

📈 Market Cap: ${formatExactCurrency(reportData.marketCap)} ${formatReportChange(reportData.marketCapChange)} ${getChangeIndicator(reportData.marketCapChange)}

📊 Volume: ${formatExactCurrency(reportData.volume24h)} ${formatReportChange(reportData.volumeChange)} ${getChangeIndicator(reportData.volumeChange)}

🔥 WCO Burnt: ${formatExactWCO(reportData.wcoBurnt)} ${formatReportChange(reportData.wcoBurntChange)} ${getChangeIndicator(reportData.wcoBurntChange)}

#WCO #WChain #CryptoUpdate #DeFi`;
  };

  const handleCopy = async () => {
    const reportText = generateReportText();
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      toast({
        title: "Report Copied!",
        description: "Daily report has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to Copy",
        description: "Please try copying manually.",
        variant: "destructive"
      });
    }
  };

  const reportText = generateReportText();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            WCO Daily Report Generator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 border">
            <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
              {reportText}
            </pre>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Ready to share your daily WCO update!
            </p>
            
            <Button 
              onClick={handleCopy} 
              className="flex items-center gap-2"
              disabled={!reportData}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}