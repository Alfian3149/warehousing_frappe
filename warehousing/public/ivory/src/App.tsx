import { useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { LoginPage } from './components/LoginPage';
import { EmployeeVerification } from './components/EmployeeVerification';
import { HomeScreen } from './components/HomeScreen';
import { RackCheck } from './components/RackCheck';
import { ItemInfo } from './components/ItemInfo';
import { MaterialIncoming } from './components/MaterialIncoming';
import { MaterialPicking } from './components/MaterialPicking';
import { MaterialHandover } from './components/MaterialHandover';
import { MaterialTransfer } from './components/MaterialTransfer';
import { MaterialReturn } from './components/MaterialReturn';
import { MaterialConsumption } from './components/MaterialConsumption';

export type Screen = 'home' | 'rack-check' | 'item-info' | 'incoming' | 'picking' | 'handover' | 'transfer' | 'return' | 'consumption';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [employeeName, setEmployeeName] = useState('');

  const handleLogin = (username: string) => {
    setIsLoggedIn(true);
    setEmployeeName(username);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentScreen('home');
    setEmployeeName('');
  };

  const navigateBack = () => {
    setCurrentScreen('home');
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentScreen === 'home' && (
        <HomeScreen onNavigate={setCurrentScreen} employeeName={employeeName} onLogout={handleLogout} />
      )}
      {currentScreen === 'rack-check' && (
        <RackCheck onBack={navigateBack} />
      )}
      {currentScreen === 'item-info' && (
        <ItemInfo onBack={navigateBack} />
      )}
      {currentScreen === 'incoming' && (
        <MaterialIncoming onBack={navigateBack} />
      )}
      {currentScreen === 'picking' && (
        <MaterialPicking onBack={navigateBack} />
      )}
      {currentScreen === 'handover' && (
        <MaterialHandover onBack={navigateBack} />
      )}
      {currentScreen === 'transfer' && (
        <MaterialTransfer onBack={navigateBack} />
      )}
      {currentScreen === 'return' && (
        <MaterialReturn onBack={navigateBack} />
      )}
      {currentScreen === 'consumption' && (
        <MaterialConsumption onBack={navigateBack} />
      )}
    </div>
  );
}