import { SparklesCore } from "@/components/ui/sparkles";
import { LoginPage } from "@/components/features/LoginPage";
import type { User } from '@/types'

interface LoginProps {
  onLogin: (user: User) => void;
}

export function Login({ onLogin }: LoginProps) {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden touch-action-none">
      {/* Sparkles фон */}
      <SparklesCore
        id="tsparticles"
        background="transparent"
        minSize={0.6}
        maxSize={1.4}
        particleColor="#ffdb33"
        particleDensity={100}
        speed={1}
        className="absolute inset-0 z-0 overflow-hidden"
      />

      {/* Контент */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <LoginPage onLogin={onLogin} />
      </div>
    </div>
  );
}
