import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, X, Zap, BarChart3, ArrowRight } from 'lucide-react';
import { useIntl } from 'react-intl';
import { comparisonDataKeys, pricingData } from '../../lib/comparison-data';
import type { FeatureValue } from '../../lib/comparison-data';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';

const ComparisonTable: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();

  const renderFeatureCell = (value: FeatureValue, isDeskive: boolean = false) => {
    if (value === "full") {
      if (isDeskive) {
        return (
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white px-4 py-2 rounded-full font-bold shadow-lg">
            <CheckCircle2 className="w-5 h-5" />
            <span>{intl.formatMessage({ id: 'comparison.values.full' })}</span>
          </div>
        );
      }
      return <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" />;
    } else if (value === "partial") {
      if (isDeskive) {
        return (
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full font-bold">
            <span>{intl.formatMessage({ id: 'comparison.values.partial' })}</span>
          </div>
        );
      }
      return <div className="text-sm font-semibold text-yellow-600">{intl.formatMessage({ id: 'comparison.values.partial' })}</div>;
    } else if (value === "basic") {
      return <div className="text-sm font-semibold text-yellow-600">{intl.formatMessage({ id: 'comparison.values.basic' })}</div>;
    } else {
      return <X className="w-6 h-6 text-gray-300 mx-auto" />;
    }
  };

  return (
    <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-sky-100 to-blue-100 rounded-full px-6 py-3 mb-6">
            <BarChart3 className="w-5 h-5 text-sky-600" />
            <span className="text-sm font-bold text-sky-900">{intl.formatMessage({ id: 'comparison.badge' })}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-900">
            {intl.formatMessage({ id: 'comparison.title' })}
            <br />
            <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {intl.formatMessage({ id: 'comparison.titleHighlight' })}
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {intl.formatMessage({ id: 'comparison.subtitle' })}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-gray-100"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <th className="px-6 md:px-8 py-6 text-left min-w-[200px]">
                    <div className="text-base md:text-lg font-black text-gray-900">{intl.formatMessage({ id: 'comparison.featureColumn' })}</div>
                  </th>
                  <th className="px-6 md:px-8 py-6 text-center bg-gradient-to-br from-sky-500 via-blue-600 to-cyan-600 min-w-[140px]">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-2 p-1">
                        <img
                          src="/logo.png"
                          alt="Deskive"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="text-base md:text-lg font-black text-white">{intl.formatMessage({ id: 'comparison.deskive' })}</div>
                      <div className="text-xs text-white/90">{intl.formatMessage({ id: 'comparison.deskiveTagline' })}</div>
                    </div>
                  </th>
                  <th className="px-6 md:px-8 py-6 text-center min-w-[120px]">
                    <div className="text-base md:text-lg font-bold text-gray-700">{intl.formatMessage({ id: 'comparison.platforms.slack' })}</div>
                    <div className="text-xs text-gray-500">{intl.formatMessage({ id: 'comparison.platforms.slackTagline' })}</div>
                  </th>
                  <th className="px-6 md:px-8 py-6 text-center min-w-[120px]">
                    <div className="text-base md:text-lg font-bold text-gray-700">{intl.formatMessage({ id: 'comparison.platforms.notion' })}</div>
                    <div className="text-xs text-gray-500">{intl.formatMessage({ id: 'comparison.platforms.notionTagline' })}</div>
                  </th>
                  <th className="px-6 md:px-8 py-6 text-center min-w-[120px]">
                    <div className="text-base md:text-lg font-bold text-gray-700">{intl.formatMessage({ id: 'comparison.platforms.monday' })}</div>
                    <div className="text-xs text-gray-500">{intl.formatMessage({ id: 'comparison.platforms.mondayTagline' })}</div>
                  </th>
                  <th className="px-6 md:px-8 py-6 text-center min-w-[120px]">
                    <div className="text-base md:text-lg font-bold text-gray-700">{intl.formatMessage({ id: 'comparison.platforms.clickup' })}</div>
                    <div className="text-xs text-gray-500">{intl.formatMessage({ id: 'comparison.platforms.clickupTagline' })}</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {comparisonDataKeys.map((row, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-blue-50 transition-colors group"
                  >
                    <td className="px-6 md:px-8 py-5">
                      <div className="font-bold text-gray-900 text-sm md:text-base">{intl.formatMessage({ id: row.featureTitleKey })}</div>
                      <div className="text-xs md:text-sm text-gray-600 mt-1">{intl.formatMessage({ id: row.featureDescKey })}</div>
                    </td>
                    <td className="px-6 md:px-8 py-5 text-center bg-gradient-to-r from-sky-50 to-blue-50">
                      {renderFeatureCell(row.deskive, true)}
                    </td>
                    <td className="px-6 md:px-8 py-5 text-center">
                      {renderFeatureCell(row.slack)}
                    </td>
                    <td className="px-6 md:px-8 py-5 text-center">
                      {renderFeatureCell(row.notion)}
                    </td>
                    <td className="px-6 md:px-8 py-5 text-center">
                      {renderFeatureCell(row.monday)}
                    </td>
                    <td className="px-6 md:px-8 py-5 text-center">
                      {renderFeatureCell(row.clickup)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <td className="px-6 md:px-8 py-6 font-black text-gray-900 text-base md:text-lg">{intl.formatMessage({ id: 'comparison.pricing.label' })}</td>
                  <td className="px-6 md:px-8 py-6 text-center bg-gradient-to-br from-sky-500 via-blue-600 to-cyan-600">
                    <div className="text-xl md:text-2xl font-black text-white">{pricingData.deskive.monthlyPrice}</div>
                    {pricingData.deskive.noteKey && (
                      <div className="text-xs text-white/90 mt-1">{intl.formatMessage({ id: pricingData.deskive.noteKey })}</div>
                    )}
                  </td>
                  <td className="px-6 md:px-8 py-6 text-center">
                    <div className="text-base md:text-lg font-bold text-gray-700">{pricingData.slack.monthlyPrice}</div>
                    {pricingData.slack.noteKey && (
                      <div className="text-xs text-gray-500 mt-1">{intl.formatMessage({ id: pricingData.slack.noteKey })}</div>
                    )}
                  </td>
                  <td className="px-6 md:px-8 py-6 text-center">
                    <div className="text-base md:text-lg font-bold text-gray-700">{pricingData.notion.monthlyPrice}</div>
                    {pricingData.notion.noteKey && (
                      <div className="text-xs text-gray-500 mt-1">{intl.formatMessage({ id: pricingData.notion.noteKey })}</div>
                    )}
                  </td>
                  <td className="px-6 md:px-8 py-6 text-center">
                    <div className="text-base md:text-lg font-bold text-gray-700">{pricingData.monday.monthlyPrice}</div>
                    {pricingData.monday.noteKey && (
                      <div className="text-xs text-gray-500 mt-1">{intl.formatMessage({ id: pricingData.monday.noteKey })}</div>
                    )}
                  </td>
                  <td className="px-6 md:px-8 py-6 text-center">
                    <div className="text-base md:text-lg font-bold text-gray-700">{pricingData.clickup.monthlyPrice}</div>
                    {pricingData.clickup.noteKey && (
                      <div className="text-xs text-gray-500 mt-1">{intl.formatMessage({ id: pricingData.clickup.noteKey })}</div>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <Button
            size="lg"
            onClick={() => navigate('/auth/register')}
            className="group bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold px-10 py-7 text-lg border-0 hover:scale-105 transition-all duration-300 shadow-2xl"
          >
            {intl.formatMessage({ id: 'comparison.cta.primary' })}
            <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <p className="text-sm text-gray-600 mt-4">{intl.formatMessage({ id: 'comparison.cta.trustLine' })}</p>
        </motion.div>
      </div>
    </section>
  );
};

export default ComparisonTable;
