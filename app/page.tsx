import AuthGate from "@/components/auth/AuthGate";
import CashflowApp from "@/components/CashflowApp";

export default function Page() {
  return (
    <AuthGate>
      <CashflowApp />
    </AuthGate>
  );
}
