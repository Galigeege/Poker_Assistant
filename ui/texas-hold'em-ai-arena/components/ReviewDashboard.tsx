import React from 'react';
import { HandHistory } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, TrendingUp, AlertCircle } from 'lucide-react';

interface ReviewProps {
  history: HandHistory[];
  onBack: () => void;
}

const ReviewDashboard: React.FC<ReviewProps> = ({ history, onBack }) => {
  // Mock data for the graph if history is empty
  const data = history.length > 0 ? history.map((h, i) => ({ name: i + 1, profit: h.profit })) : [
    { name: 0, profit: 0 },
    { name: 5, profit: 120 },
    { name: 10, profit: 80 },
    { name: 15, profit: 250 },
    { name: 20, profit: 190 },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Menu
          </button>
          <h1 className="text-2xl font-bold">Session Review</h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Net Profit</div>
            <div className="text-3xl font-mono font-bold text-emerald-400">+$190.00</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Hands Played</div>
            <div className="text-3xl font-mono font-bold text-white">24</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
             <div className="text-gray-400 text-sm mb-1">VPIP / PFR</div>
             <div className="text-3xl font-mono font-bold text-yellow-400">28 / 22</div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-[400px]">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            Chip Graph
          </h3>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                itemStyle={{ color: '#F3F4F6' }}
              />
              <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Key Hands List */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Key Hands Analysis</h3>
          </div>
          <div className="divide-y divide-gray-700">
             {[1, 2, 3].map((i) => (
               <div key={i} className="p-4 hover:bg-gray-750 flex items-center justify-between group cursor-pointer transition-colors">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded bg-red-900/30 flex items-center justify-center text-red-400 font-bold border border-red-800">
                     {i === 1 ? 'AA' : i === 2 ? 'AKs' : '76s'}
                   </div>
                   <div>
                     <div className="font-medium text-white">Large Pot vs Bot_Pro</div>
                     <div className="text-xs text-gray-400">Turn Check-Raise Analysis</div>
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                    {i === 2 && <span className="text-xs bg-yellow-900/50 text-yellow-200 px-2 py-1 rounded flex gap-1 items-center"><AlertCircle className="w-3 h-3"/> Mistake</span>}
                    <span className={`font-mono font-bold ${i === 2 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {i === 2 ? '-$50' : '+$120'}
                    </span>
                    <ChevronRight className="text-gray-600 group-hover:text-white" />
                 </div>
               </div>
             ))}
          </div>
        </div>

      </div>
    </div>
  );
};

// Helper icon for list
const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default ReviewDashboard;