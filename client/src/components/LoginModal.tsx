import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import { Trans } from "@lingui/react/macro";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [loginStatus, setLoginStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const login = useAuthStore((state) => state.login);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    const result = await login(email);
    if (result === "success") {
      onClose();
    } else {
      setErrorMessage("Failed to send login email.");
      setLoginStatus("error");
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle><Trans>Sign in</Trans></DialogTitle>
          <DialogDescription>
          <Trans>
            To authorize, please enter your email address, then you'll receive a
            magic link in your inbox.</Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
            <Trans>Email</Trans>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
            />
          </div>
          {loginStatus === "error" && (
            <p className="text-red-600">{errorMessage}</p>
          )}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleLogin}>
          <Trans>Send</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
