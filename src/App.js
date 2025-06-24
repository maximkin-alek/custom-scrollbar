import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import AppleScrollbar from './AppleScrollbar.tsx';
import './App.css';
import { TEXT } from './data.ts';

function App() {
  return (
    <div className="app">
      <h1>Custom scrollbar</h1>

      {/* Реализация библиотеки overlayscrollbars-react */}
      <OverlayScrollbarsComponent
        defer
        className="block"
        options={{ scrollbars: { theme: 'os-theme-borsch', autoHide: 'scroll' } }}
      >
        {TEXT}
        <img
          src="https://i.pinimg.com/736x/e7/20/da/e720dae7575ae813e602940d5be8016c.jpg"
          alt=""
        />
      </OverlayScrollbarsComponent>

      {/* Кастомный вариант */}
      <AppleScrollbar className="custom-container" scrollbarWidth={6} fadeTimeout={1000}>
        <div className="long-content">{TEXT}</div>
        <img
          src="https://i.pinimg.com/736x/e7/20/da/e720dae7575ae813e602940d5be8016c.jpg"
          alt=""
        />
      </AppleScrollbar>
    </div>
  );
}

export default App;
