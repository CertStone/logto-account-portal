'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NProgress from 'nprogress';

// 配置 NProgress
if (typeof window !== 'undefined') {
  NProgress.configure({
    showSpinner: false, 
    speed: 400, 
    minimum: 0.2,
    trickleSpeed: 200, 
  });
}

const LoadingBar = () => {
  const pathname = usePathname();

  useEffect(() => {
    // 路由变化时显示进度条
    const timer = setTimeout(() => {
      NProgress.done();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    // 监听全局点击事件以捕获导航和表单提交
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      const clickableElement = target.closest('a, button, [role="button"], [data-navigate]');
      
      if (clickableElement) {
        const element = clickableElement as HTMLAnchorElement | HTMLButtonElement;
        
        if (element.tagName === 'A') {
          const href = element.getAttribute('href');
          if (href && href.startsWith('/') && href !== pathname) {
            NProgress.start();
          }
        }
        
        if (element.tagName === 'BUTTON') {
          const type = element.getAttribute('type');
          const form = element.closest('form');
          
          if (type === 'submit' || form) {
            NProgress.start();
          }
        }
      }
    };

    const handleFormSubmit = () => {
      NProgress.start();
    };

    const handleBeforeUnload = () => {
      NProgress.start();
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('submit', handleFormSubmit);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('submit', handleFormSubmit);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pathname]);

  return null;
};

export default LoadingBar;
