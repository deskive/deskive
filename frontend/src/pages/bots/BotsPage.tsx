/**
 * Bots Page
 * Bot management interface with bot builder and automation management
 */

import { Routes, Route } from 'react-router-dom'
import { BotsView } from '../../components/bots/BotsView'
import { BotBuilder } from '../../components/bots/BotBuilder'
import { BotLogsView } from '../../components/bots/BotLogsView'

const BotsPage = () => {
  return (
    <Routes>
      <Route path="/" element={<BotsView />} />
      <Route path="/create" element={<BotBuilder />} />
      <Route path="/:botId" element={<BotBuilder />} />
      <Route path="/:botId/logs" element={<BotLogsView />} />
    </Routes>
  )
}

export default BotsPage
