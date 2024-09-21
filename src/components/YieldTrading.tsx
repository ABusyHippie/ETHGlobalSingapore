import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useToast } from "@/components/ui/use-toast";
import Loader from "@/components/ui/loader";
import { useQuery } from '@tanstack/react-query';
import { gql, request } from 'graphql-request';
import { motion } from 'framer-motion';

interface YieldItem {
  name: string;
  apy: number;
}

const query = gql`{
  apyupdateds(first: 5) {
    id
    newAPY
    blockNumber
    blockTimestamp
  }
  ownershipTransferreds(first: 5) {
    id
    previousOwner
    newOwner
    blockNumber
  }
}`;

const url = 'https://api.studio.thegraph.com/query/89588/eth-global-singapore/version/latest';

export default function YieldTrading() {
  const [yieldData, setYieldData] = useState([]);
  const [selectedYield, setSelectedYield] = useState<YieldItem | null>(null);
  const [leverage, setLeverage] = useState(1);
  const [rbtcAmount, setRbtcAmount] = useState<string>('');

  const { address } = useAccount();
  const { toast } = useToast();
  const [position, setPosition] = useState<'long' | 'short'>('long');
  const { data: apyData, status } = useQuery({
    queryKey: ['apyData'],
    queryFn: async () => await request(url, query)
  });

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const gradientColors = {
    long: ['#134e5e', '#71b280'],
    short: ['#8B0000', '#FF6347'] 
  };

  useEffect(() => {
    if (status === 'success' && apyData) {
      const formattedYieldData = apyData.apyupdateds.map((item: any) => ({
        name: `APY ${item.id}`,
        apy: parseFloat(item.newAPY)
      }));
      setYieldData(formattedYieldData);
    }
  }, [apyData, status]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  const handleTrade = async () => {
    // Implement trading logic here to interact with the smart contract
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

  const calculateSize = () => {
    if (!rbtcAmount || !leverage) return '-';
    const size = parseFloat(rbtcAmount) * leverage;
    return size.toFixed(4);
  };

  return (
    <motion.div 
      ref={containerRef}
      className="min-h-screen p-4 overflow-hidden relative"
      animate={{
        background: `linear-gradient(135deg, ${gradientColors[position][0]}, ${gradientColors[position][1]})`
      }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%)`
        }}
        transition={{ type: 'tween', ease: 'backOut', duration: 0.5 }}
      />
      <div className="max-w-md mx-auto relative z-10">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">Yield Trading</span>
            <button className="bg-gray-700 p-2 rounded-full">
              {/* Add settings icon if needed*/} 
            </button>
          </div>
        </header>

        <Card className="bg-gray-800/80 text-white mb-4 backdrop-blur-sm">
          <CardContent className="p-4 space-y-6">
            <div>
              <label className="block mb-2">Select Yield</label>
              <select
                className="w-full bg-gray-700 rounded p-2"
                onChange={(e) => setSelectedYield(JSON.parse(e.target.value))}
              >
                <option value="">Select an APY</option>
                {yieldData.map((yieldItem: YieldItem) => (
                  <option key={yieldItem.name} value={JSON.stringify(yieldItem)}>
                    {yieldItem.name} - {yieldItem.apy.toFixed(2)}%
                  </option>
                ))}
              </select>
            </div>

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
              <label className="block mb-2">You're Paying (RBTC)</label>
              <input
                type="number"
                value={rbtcAmount}
                onChange={(e) => setRbtcAmount(e.target.value)}
                className="w-full bg-gray-700 rounded p-2"
                placeholder="Enter RBTC amount"
              />
            </div>

            <div>
              <label className="block mb-2">Size of {position === 'long' ? 'Long' : 'Short'}</label>
              <div className="flex items-center bg-gray-700 rounded p-2">
                <span className="flex-1">RBTC</span>
                <span className="text-right w-1/2">{calculateSize()}</span>
              </div>
            </div>

            <div>
              <label className="block mb-2">Leverage</label>
              <div className="bg-gray-700 rounded p-2 flex justify-between items-center">
                <button className="text-2xl" onClick={() => setLeverage(Math.max(1, leverage - 0.1))}>-</button>
                <span>{leverage.toFixed(1)}x</span>
                <button className="text-2xl" onClick={() => setLeverage(Math.min(100, leverage + 0.1))}>+</button>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="0.1"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Collateral</span>
                <span>{rbtcAmount ? `${rbtcAmount} RBTC` : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>Size in RBTC</span>
                <span>{calculateSize()}</span>
              </div>
            </div>

            <Button
              onClick={handleTrade}
              disabled={!selectedYield || !address || !rbtcAmount}
              className={`w-full ${position === 'long' ? 'bg-green-500' : 'bg-red-500'}`}
            >
              {position === 'long' ? 'Long' : 'Short'}
            </Button>
          </CardContent>
        </Card>
      </div>
      {status === 'pending' && <Loader />}
      {status === 'error' && <div>Error occurred querying the Subgraph</div>}
    </motion.div>
  );
}
