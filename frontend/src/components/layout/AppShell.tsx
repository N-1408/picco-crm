import { type ReactNode } from 'react';
import BottomNavBar, { type BottomNavItem } from './BottomNavBar';
import TopBar from './TopBar';

interface AppShellProps {
  title?: string;
  subtitle?: string;
  showTopBar?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  actions?: ReactNode;
  navigation?: BottomNavItem[];
  floatingAction?: ReactNode;
  children: ReactNode;
}

export default function AppShell({
  title,
  subtitle,
  showTopBar = true,
  showBack = false,
  onBack,
  actions,
  navigation,
  floatingAction,
  children
}: AppShellProps) {
  return (
    <div className="app-shell">
      {showTopBar ? (
        <TopBar
          title={title}
          subtitle={subtitle}
          showBack={showBack}
          onBack={onBack}
          actions={actions}
        />
      ) : null}

      <div className="app-shell__content">{children}</div>

      {floatingAction}

      {navigation && navigation.length ? <BottomNavBar items={navigation} /> : null}
    </div>
  );
}
