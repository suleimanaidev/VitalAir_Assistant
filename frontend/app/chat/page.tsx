import ProfileSetupGuard from "@/components/auth/ProfileSetupGuard";
import AppSidebarLayout from "@/components/AppSidebarLayout";
import ChatView from "@/components/chat/ChatView";

export default function ChatPage() {
  return (
    <ProfileSetupGuard>
      <AppSidebarLayout>
        <ChatView />
      </AppSidebarLayout>
    </ProfileSetupGuard>
  );
}
