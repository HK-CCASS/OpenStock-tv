'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, LineChart, AreaChart, CandlestickChart } from 'lucide-react';
import { ChartType } from './TradingViewMiniChart';

interface ChartTypeSelectorProps {
  value: ChartType;
  onChange: (type: ChartType) => void;
}

const chartTypes: Array<{ value: ChartType; label: string; icon: React.ReactNode }> = [
  { value: 'area', label: '面积图', icon: <AreaChart className="h-4 w-4" /> },
  { value: 'line', label: '折线图', icon: <LineChart className="h-4 w-4" /> },
  { value: 'candles', label: 'K线图', icon: <CandlestickChart className="h-4 w-4" /> },
  { value: 'bars', label: '柱状图', icon: <BarChart3 className="h-4 w-4" /> },
];

export default function ChartTypeSelector({ value, onChange }: ChartTypeSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[110px] h-8 bg-gray-700 border-gray-600 text-gray-100 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-700">
        {chartTypes.map((type) => (
          <SelectItem
            key={type.value}
            value={type.value}
            className="text-gray-100 hover:bg-gray-700 focus:bg-gray-700"
          >
            <div className="flex items-center gap-2">
              {type.icon}
              <span>{type.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
