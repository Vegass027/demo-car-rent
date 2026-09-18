import { useState } from "react";
import { Button } from "@/components/retroui/Button";
import { Input } from "@/components/retroui/Input";
import { useSignIn } from "@/hooks/useAuth";
import type { User } from "@/types";

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const OWNER_USERNAME = "Owner";
const OWNER_PASSWORD = "owner123";

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { mutate: signIn, isPending, error } = useSignIn();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn({ username, password }, {
      onSuccess: (data) => {
        if (data.user) {
          onLogin(data.user);
        }
      },
    });
  };

  const handleLoginAsOwner = () => {
    setUsername(OWNER_USERNAME);
    setPassword(OWNER_PASSWORD);
    signIn(
      { username: OWNER_USERNAME, password: OWNER_PASSWORD },
      {
        onSuccess: (data) => {
          if (data.user) {
            onLogin(data.user);
          }
        },
      }
    );
  };

  return (
    <div className="w-full max-w-xs mx-auto p-4 sm:p-5 bg-card border-2 border-border shadow-xl rounded-lg">
      <h2 className="font-head text-2xl sm:text-3xl text-card-foreground text-center mb-4 sm:mb-5">
        ВХОД
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1">
            Логин
          </label>
          <Input
            type="text"
            placeholder="Введите логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isPending}
            className="bg-white text-sm"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-1">
            Пароль
          </label>
          <Input
            type="password"
            placeholder="Введите пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isPending}
            className="bg-white text-sm"
          />
        </div>

        {error && (
          <p className="text-destructive text-xs sm:text-sm text-center">{error.message}</p>
        )}

        <div className="flex justify-center pt-2">
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="px-8"
          >
            {isPending ? "ВХОД..." : "ВОЙТИ"}
          </Button>
        </div>

        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={handleLoginAsOwner}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#ffdb33] bg-white px-4 py-1.5 text-xs sm:text-sm font-medium text-[#111] shadow-[0_0_0_3px_rgba(255,219,51,0.18)] transition-all duration-200 hover:bg-[#fff8d9] hover:shadow-[0_0_0_4px_rgba(255,219,51,0.28)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#ffdb33]" />
            Войти как Владелец
          </button>
        </div>
      </form>
    </div>
  );
}
