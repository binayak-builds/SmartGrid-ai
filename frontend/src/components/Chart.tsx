import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Filler, Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

interface MonthlyUsage {
    month: string;
    units: number;
}

export default function UsageChart({ data }: { data?: MonthlyUsage[] | null }) {
    ChartJS.defaults.color = '#64748b';
    ChartJS.defaults.font.family = 'Inter';

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(5, 12, 32, 0.95)',
                titleColor: '#fff',
                titleFont: { family: 'Space Grotesk', weight: 'bold' as const, size: 14 },
                bodyColor: '#60a5fa',
                bodyFont: { family: 'Inter', weight: 600, size: 13 },
                borderColor: 'rgba(99, 162, 255, 0.25)',
                borderWidth: 1,
                padding: 14,
                displayColors: false,
                cornerRadius: 10,
                caretSize: 6,
                callbacks: { label: (ctx: { raw: unknown }) => `⚡ ${ctx.raw} kWh` }
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(99, 162, 255, 0.05)', drawBorder: false },
                ticks: { color: '#475569', font: { size: 10 } },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 10, weight: 'bold' as const } },
                border: { display: false }
            }
        },
        interaction: { mode: 'index' as const, intersect: false },
        animations: {
            tension: { duration: 1000, easing: 'linear' as const, from: 0.8, to: 0.4, loop: false }
        }
    };

    // Use passed data if available, reverse it to show chronological order, or simulated data.
    const hasData = data && Array.isArray(data) && data.length > 0;
    const sortedData = hasData ? [...data].reverse() : [];
    
    // Fill empty months if we have fewer than 6
    const fillLength = Math.max(0, 6 - sortedData.length);
    const paddedLabels = hasData 
        ? [...Array(fillLength).fill(''), ...sortedData.map(d => d.month)]
        : ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
        
    const chartDataValues = hasData 
        ? [...Array(fillLength).fill(0), ...sortedData.map(d => d.units)]
        : [120, 110, 140, 125, 105, 130];

    const chartData = {
        labels: paddedLabels.slice(-6), // Last 6 months
        datasets: [{
            fill: true,
            label: 'Units Consumed',
            data: chartDataValues.slice(-6),
            borderColor: '#3b82f6',
            borderWidth: 3,
            backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(59,130,246,0.3)');
                gradient.addColorStop(0.5, 'rgba(139,92,246,0.05)');
                gradient.addColorStop(1, 'rgba(59,130,246,0.0)');
                return gradient;
            },
            pointBackgroundColor: '#fff',
            pointBorderColor: '#3b82f6',
            pointBorderWidth: 4,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#3b82f6',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 3,
            tension: 0.4
        }],
    };

    return <Line options={options} data={chartData} />;
}
