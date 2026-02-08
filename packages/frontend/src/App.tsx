import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout.js';
import { Dashboard } from './routes/Dashboard.js';
import { Tournament } from './routes/Tournament.js';
import { Leaderboard } from './routes/Leaderboard.js';
import { SurvivalPlay } from './routes/SurvivalPlay.js';
import { MyBets } from './routes/MyBets.js';
import { GameContainer } from './components/game';
import { GameViewer } from './routes/GameViewer.js';

/** 메인 애플리케이션 컴포넌트 */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/tournament/:id" element={<Tournament />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/my-bets" element={<MyBets />} />
      </Route>
      <Route path="/game" element={<GameContainer />} />
      <Route path="/match/:id" element={<GameViewer />} />
      <Route path="/survival" element={<SurvivalPlay />} />
    </Routes>
  );
}
