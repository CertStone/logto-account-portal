'use client';

import { useCallback } from 'react';
import NProgress from 'nprogress';

// 配置 NProgress 的全局选项
if (typeof window !== 'undefined') {
  NProgress.configure({
    showSpinner: false,
    speed: 400,
    minimum: 0.2,
    trickleSpeed: 200,
  });
}

export const useNProgress = () => {
  const start = useCallback(() => NProgress.start(), []);
  const done = useCallback(() => NProgress.done(), []);
  const set = useCallback((progress: number) => NProgress.set(progress), []);
  const inc = useCallback((amount?: number) => NProgress.inc(amount), []);
  
  return { start, done, set, inc };
};

// 用于按钮点击时显示进度条的自定义 Hook
export const useButtonProgress = () => {
  const { start, done } = useNProgress();
  
  const handleClick = useCallback(() => {
    start();
  }, [start]);
  
  const handleAsyncAction = useCallback(async (action: () => Promise<void>) => {
    start();
    try {
      await action();
    } finally {
      done();
    }
  }, [start, done]);
  
  return { handleClick, handleAsyncAction, start, done };
};
