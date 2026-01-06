import React, { useState, useEffect, useRef } from 'react';

interface ScaleContainerProps {
    width?: number;
    height?: number;
    children: React.ReactNode;
    className?: string;
}

/**
 * 自动缩放容器
 * 将内容固定在指定分辨率 (默认 1920x1080)，并自动缩放以适应当前窗口
 */
const ScaleContainer: React.FC<ScaleContainerProps> = ({
    width = 1920,
    height = 1080,
    children,
    className = ""
}) => {
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            // 计算宽和高的缩放比例
            const scaleX = windowWidth / width;
            const scaleY = windowHeight / height;

            // 使用 cover 模式铺满全屏，避免黑边
            // 对于大屏展示场景，宁可轻微裁切也要保证无黑边
            const currentScale = Math.max(scaleX, scaleY);

            setScale(currentScale);
        };

        // 初始化
        handleResize();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, [width, height]);

    return (
        <div
            className="w-screen h-screen overflow-hidden bg-[#0F172A] flex items-center justify-center relative"
        >
            <div
                ref={containerRef}
                className={className}
                style={{
                    width: width,
                    height: height,
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                    flexShrink: 0,
                    // 强制使用绝对定位或 flex 居中
                    position: 'relative'
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default ScaleContainer;
