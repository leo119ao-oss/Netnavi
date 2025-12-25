"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

type Schedule = {
    id: string;
    title: string;
    start: string; // ISO string
    end: string;   // ISO string
    category?: string;
};

export default function ScheduleView() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [dates, setDates] = useState<Date[]>([]);

    useEffect(() => {
        // 今日から1週間分の日付を生成
        const today = new Date();
        const nextWeek = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            nextWeek.push(date);
        }
        setDates(nextWeek);

        // スケジュール取得
        const fetchSchedules = async () => {
            const startStr = nextWeek[0].toISOString();
            const endStr = nextWeek[6].toISOString(); // 簡易的に1週間
            try {
                const res = await fetch(`/api/schedule?start=${startStr}&end=${endStr}`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data.schedules)) {
                        setSchedules(data.schedules);
                    } else {
                        setSchedules([]);
                    }
                } else {
                    setSchedules([]);
                }
            } catch (error) {
                console.error("Failed to fetch schedules", error);
                setSchedules([]);
            }
        };

        fetchSchedules();

        // ポーリングで定期更新 (簡易実装)
        const interval = setInterval(fetchSchedules, 5000);
        return () => clearInterval(interval);
    }, []);

    // 09:00 から 22:00 までの時間軸
    const hours = Array.from({ length: 14 }, (_, i) => i + 9);

    const getScheduleStyle = (schedule: Schedule, date: Date) => {
        const start = new Date(schedule.start);
        const end = new Date(schedule.end);

        // 同じ日付かチェック
        if (start.getDate() !== date.getDate() || start.getMonth() !== date.getMonth()) return null;

        const startHour = start.getHours();
        const startMin = start.getMinutes();
        const endHour = end.getHours();
        const endMin = end.getMinutes();

        // 9時から起算した分数
        const startTotalMins = (startHour - 9) * 60 + startMin;
        const durationMins = (endHour * 60 + endMin) - (startHour * 60 + startMin);

        return {
            top: `${(startTotalMins / 60) * 60}px`, // 1時間 = 60px
            height: `${(durationMins / 60) * 60}px`,
            position: 'absolute' as const,
            width: '95%',
        };
    };

    return (
        <div className="h-full flex flex-col bg-slate-900 border-l border-slate-700 w-[400px] shrink-0 overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-900 z-10">
                <h2 className="text-pet-blue font-orbitron font-bold">SCHEDULE</h2>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div className="flex min-w-max">
                    {/* 時間軸 */}
                    <div className="w-12 flex-shrink-0 bg-slate-900 border-r border-slate-800 sticky left-0 z-10">
                        <div className="h-8 border-b border-slate-800"></div> {/* Header spacer */}
                        {hours.map(hour => (
                            <div key={hour} className="h-[60px] text-xs text-slate-500 text-right pr-2 pt-1 border-b border-slate-800/50">
                                {hour}:00
                            </div>
                        ))}
                    </div>

                    {/* 日付カラム */}
                    {dates.map((date) => (
                        <div key={date.toISOString()} className="w-32 border-r border-slate-800 relative flex-shrink-0">
                            {/* 日付ヘッダー */}
                            <div className="h-8 border-b border-slate-700 bg-slate-800/50 text-center text-xs text-slate-300 flex items-center justify-center sticky top-0 z-10 backdrop-blur-sm">
                                {date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}
                            </div>

                            {/* グリッド線 */}
                            {hours.map(hour => (
                                <div key={hour} className="h-[60px] border-b border-slate-800/30"></div>
                            ))}

                            {/* スケジュールアイテム */}
                            {schedules.map(schedule => {
                                const style = getScheduleStyle(schedule, date);
                                if (!style) return null;
                                return (
                                    <div
                                        key={schedule.id}
                                        style={style}
                                        className="left-1 bg-pet-blue/20 border-l-2 border-pet-blue rounded px-1 py-1 text-[10px] text-white overflow-hidden hover:bg-pet-blue/30 transition-colors cursor-pointer"
                                        title={`${schedule.title} (${new Date(schedule.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(schedule.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                                    >
                                        <div className="font-bold truncate">{schedule.title}</div>
                                        <div className="opacity-70 truncate">{new Date(schedule.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
