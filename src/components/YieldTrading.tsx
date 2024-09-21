import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useToast } from "@/components/ui/use-toast";
import Loader from "@/components/ui/loader";

interface YieldItem {
  name: string;
  apy: number;
}

export default function YieldTrading() {
  const [yieldData, setYieldData] = useState([]);
  const [selectedYield, setSelectedYield] = useState<YieldItem | null>(null);
  const [leverage, setLeverage] = useState(1);
  const { address } = useAccount();
  const { toast } = useToast();
  const [position, setPosition] = useState<'long' | 'short'>('long');

  useEffect(() => {
    // Fetch yield data from API (placeholder, to be replaced with actual API call)
    const fetchYieldData = async () => {
      // const response = await fetch('api-endpoint');
      // const data = await response.json();
      // setYieldData(data);
    };

    fetchYieldData();
  }, []);

  const handleTrade = async () => {
    // Implement trading logic here, should interact with the smart contract
    try {
      // Placeholder for contract interaction
      // const result = await TradingContract.trade(selectedYield, leverage);
      toast({
        title: "Trade Successful",
        description: `You've traded ${selectedYield} with ${leverage}x leverage`,
      });
    } catch (error) {
      toast({
        title: "Trade Failed",
        description: "An error occurred while processing your trade",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">Yield Trading</span>
            <button className="bg-gray-700 p-2 rounded-full">
              {/* Add settings icon if needed*/} 
            </button>
          </div>
        </header>

        <Card className="bg-gray-800 text-white">
          <CardContent className="p-4 space-y-6">
            <div className="flex space-x-2 mb-4">
              <Button 
                variant={position === 'long' ? "default" : "outline"} 
                className={`flex-1 ${position === 'long' ? 'bg-green-500' : ''}`}
                onClick={() => setPosition('long')}
              >
                Long
              </Button>
              <Button 
                variant={position === 'short' ? "default" : "outline"} 
                className={`flex-1 ${position === 'short' ? 'bg-red-500' : ''}`}
                onClick={() => setPosition('short')}
              >
                Short
              </Button>
            </div>

            <div>
              <label className="block mb-2">You're Paying</label>
              <div className="flex items-center bg-gray-700 rounded p-2">
                <span className="flex-1">Selected Yield</span>
                <input
                  type="number"
                  className="bg-transparent text-right w-1/2"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2">Size of {position === 'long' ? 'Long' : 'Short'}</label>
              <div className="flex items-center bg-gray-700 rounded p-2">
                <span className="flex-1">Selected Yield</span>
                <input
                  type="number"
                  className="bg-transparent text-right w-1/2"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2">Leverage</label>
              <div className="bg-gray-700 rounded p-2 flex justify-between items-center">
                <button className="text-2xl" onClick={() => setLeverage(Math.max(1, leverage - 0.1))}>-</button>
                <span>{leverage.toFixed(1)}x</span>
                <button className="text-2xl" onClick={() => setLeverage(Math.min(25, leverage + 0.1))}>+</button>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                step="0.1"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Collateral</span>
                <span>-</span>
              </div>
              <div className="flex justify-between">
                <span>Size in USD</span>
                <span>-</span>
              </div>
            </div>

            <Button
              onClick={handleTrade}
              disabled={!selectedYield || !address}
              className={`w-full ${position === 'long' ? 'bg-green-500' : 'bg-red-500'}`}
            >
              {position === 'long' ? 'Long' : 'Short'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
