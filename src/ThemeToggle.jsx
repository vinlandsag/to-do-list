import React, { useState, useEffect } from 'react';
import { repository } from './data/repository.js';

const ThemeToggle = () => {
  const [theme, setTheme] = useState('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      let savedTheme = await repository.getTheme();
      if (!savedTheme) {
        const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        savedTheme = userPrefersDark ? 'dark' : 'light';
      }
      setTheme(savedTheme);
      setLoaded(true);
    }
    loadTheme();
  }, []);

  useEffect(() => {
    if (loaded) {
      document.body.setAttribute('data-theme', theme);
      repository.saveTheme(theme);
    }
  }, [theme, loaded]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="theme-switch-wrapper">
      <label className="theme-switch" htmlFor="checkbox">
        <input
          type="checkbox"
          id="checkbox"
          onChange={toggleTheme}
          checked={theme === 'dark'}
        />
        <div className="slider"></div>
      </label>
    </div>
  );
};

export default ThemeToggle;
