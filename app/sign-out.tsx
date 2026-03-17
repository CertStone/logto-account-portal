'use client';

import { useNProgress } from './hooks/useNProgress';

type Props = {
  onSignOut: () => Promise<void>;
};

const SignOut = ({ onSignOut }: Props) => {
  const { start } = useNProgress();

  const handleSignOut = async () => {
    start(); // 立即显示进度条
    try {
      await onSignOut();
    } finally {
      // 进度条会在路由变化时自动完成，这里不需要手动调用 done()
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg text-sm sm:text-base min-h-[44px]"
    >
      登出
    </button>
  );
};

export default SignOut;