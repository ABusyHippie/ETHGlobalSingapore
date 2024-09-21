import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { useAccount, useSignMessage, useReadContract, useWriteContract, useContractRead } from "wagmi";
import { useToast } from "@/components/ui/use-toast";
import Loader from "@/components/ui/loader";
import { useQuery } from '@tanstack/react-query';
import { gql, request } from 'graphql-request';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';
import LidoAPYPerpetualABI from '../../abi.json';

// Import environment variables
const CONTRACT_ADDRESS = '0x5c617a8f9bd9620604c5bfb30e5c7812f37bae73';
// const CHAIN_ID = import.meta.env.VITE_CHAIN_ID;
// const ROOTSTOCK_TESTNET_RPC_URL = import.meta.env.VITE_ROOTSTOCK_TESTNET_RPC_URL;

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

interface Position {
  isLong: boolean;
  size: string;
  collateral: string;
  entryAPY: string;
  leverage: string;
  liquidationAPY: string;
  openTime: string;
  tokenAddress: string;
  takeProfitAPY: string;
  stopLossAPY: string;
}

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

  const { data: contractAPY, isLoading, isError } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: LidoAPYPerpetualABI,
    functionName: 'currentAPY',
  });

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const gradientColors = {
    long: ['#134e5e', '#71b280'],
    short: ['#8B0000', '#FF6347'] 
  };

  const [openPosition, setOpenPosition] = useState<Position | null>(null);

  const { data: positionData, refetch: refetchPosition } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: LidoAPYPerpetualABI,
    functionName: 'getPosition',
    args: [address, ethers.constants.AddressZero],
    enabled: !!address,
  });

  useEffect(() => {
    if (positionData) {
      setOpenPosition(positionData as Position);
    }
  }, [positionData]);

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
    if (contractAPY) {
      const formattedYieldData = [{
        name: 'Current APY',
        apy: parseFloat(ethers.utils.formatUnits(contractAPY, 18))
      }];
      setYieldData(formattedYieldData);
    }
  }, [contractAPY]);

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

  const { signMessage } = useSignMessage();
  const { writeContract } = useWriteContract();

  const handleTrade = async () => {
    if (!selectedYield || !rbtcAmount || !leverage || !address) return;

    try {
      const collateralAmount = ethers.utils.parseEther(rbtcAmount);
      const leverageWei = ethers.utils.parseUnits(leverage.toString(), 18);
      const takeProfitAPY = ethers.utils.parseUnits((selectedYield.apy * 1.1).toString(), 16);
      const stopLossAPY = ethers.utils.parseUnits((selectedYield.apy * 0.9).toString(), 16);

      const result = await writeContract({
        address: CONTRACT_ADDRESS,
        abi: LidoAPYPerpetualABI,
        functionName: 'openPosition',
        args: [
          ethers.constants.AddressZero,
          position === 'long',
          collateralAmount,
          leverageWei,
          takeProfitAPY,
          stopLossAPY
        ],
        value: collateralAmount,
      });

      if (!result) {
        throw new Error('Transaction failed');
      }

      toast({
        title: "Trade Submitted",
        description: `Transaction submitted. Please wait for confirmation.`,
      });

      // Wait for transaction confirmation
      const receipt = await result.wait();

      toast({
        title: "Trade Successful",
        description: `You've opened a ${position} position with ${leverage}x leverage. Transaction hash: ${receipt.transactionHash}`,
      });

      // Refetch the position data after a successful trade
      refetchPosition();
    } catch (error) {
      console.error('Error opening position:', error);
      toast({
        title: "Trade Failed",
        description: error instanceof Error ? error.message : "An error occurred while processing your trade",
        variant: "destructive",
      });
    }
  };

  const closePosition = async () => {
    if (!address) return;

    try {
      const { hash } = await writeContract({
        address: CONTRACT_ADDRESS,
        abi: LidoAPYPerpetualABI,
        functionName: 'closePosition',
        args: [ethers.constants.AddressZero],
      });
      
      toast({
        title: "Closing Position",
        description: `Transaction hash: ${hash}`,
      });

      // Wait for transaction confirmation
      const provider = new ethers.providers.JsonRpcProvider(/* Add your RPC URL here */);
      await provider.waitForTransaction(hash);

      toast({
        title: "Position Closed",
        description: "Your position has been successfully closed",
      });

      // Refetch the position data after closing
      refetchPosition();
    } catch (error) {
      console.error('Error closing position:', error);
      toast({
        title: "Close Failed",
        description: "An error occurred while closing your position",
        variant: "destructive",
      });
    }
  };

  const calculateSize = () => {
    if (!rbtcAmount || !leverage) return '-';
    const size = parseFloat(rbtcAmount) * leverage;
    return size.toFixed(4);
  };

  // New component to display open position
  const OpenPositionCard = () => {
    if (!openPosition || openPosition.size === '0') return null;

    return (
      <Card className="bg-gray-800/80 text-white mb-4 backdrop-blur-sm">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-lg font-semibold">Open Positions</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Type:</span> {openPosition.isLong ? 'Long' : 'Short'}
            </div>
            <div>
              <span className="font-medium">Size:</span> {ethers.utils.formatEther(openPosition.size)} RBTC
            </div>
            <div>
              <span className="font-medium">Collateral:</span> {ethers.utils.formatEther(openPosition.collateral)} RBTC
            </div>
            <div>
              <span className="font-medium">Leverage:</span> {ethers.utils.formatUnits(openPosition.leverage, 18)}x
            </div>
            <div>
              <span className="font-medium">Entry APY:</span> {ethers.utils.formatUnits(openPosition.entryAPY, 18)}%
            </div>
            <div>
              <span className="font-medium">Liquidation APY:</span> {ethers.utils.formatUnits(openPosition.liquidationAPY, 18)}%
            </div>
          </div>
          <Button onClick={closePosition} className="w-full bg-red-500">
            Close Position
          </Button>
        </CardContent>
      </Card>
    );
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
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="w-full md:order-1">
            <Card className="bg-gray-800/80 text-white backdrop-blur-sm h-full">
              <CardContent className="p-4 space-y-6">
                <div>
                  <label className="block mb-2">Select Yield</label>
                  {isLoading ? (
                    <Loader />
                  ) : isError ? (
                    <div>Error loading yield data</div>
                  ) : (
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
                  )}
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
          <div className="w-full md:order-2">
            <OpenPositionCard />
          </div>
        </div>
      </div>
      {status === 'pending' && <Loader />}
      {status === 'error' && <div>Error occurred querying the Subgraph</div>}
    </motion.div>
  );
}
