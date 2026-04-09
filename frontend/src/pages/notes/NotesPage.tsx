/**
 * Notes Page
 * Notes management interface using migrated components
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { NotesView } from '../../components/notes/NotesView';

const NotesPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<NotesView />} />
      <Route path="/:noteId" element={<NotesView />} />
    </Routes>
  );
};

export default NotesPage;