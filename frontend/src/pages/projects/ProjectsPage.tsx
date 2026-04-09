/**
 * Projects Page
 * Project management interface with projects grid and task management
 */

import { Routes, Route } from 'react-router-dom'
import { ProjectsView } from '../../components/workspace/views/projects-view'

const ProjectsPage = () => {
  return (
    <Routes>
      <Route path="/" element={<ProjectsView />} />
      <Route path="/:projectId" element={<ProjectsView />} />
    </Routes>
  )
}

export default ProjectsPage
