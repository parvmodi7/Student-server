/**
 * Email Service
 * Sends AI-powered student report emails via Resend
 */
const { Resend } = require('resend');

let resendClient = null;

const getResendClient = () => {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

/**
 * Generate beautiful HTML email template for student report
 * @param {Object} data - Student report data
 * @returns {string} HTML email content
 */
const generateReportEmail = (data) => {
  const {
    studentName,
    studentId,
    gpa,
    pastGpa,
    attendance,
    courses,
    aiAnalysis,
    teacherName,
    reportDate,
  } = data;

  // GPA trend indicator
  const gpaColor = gpa >= 3.5 ? '#10b981' : gpa >= 2.5 ? '#f59e0b' : '#ef4444';
  const attendanceColor = attendance >= 80 ? '#10b981' : attendance >= 60 ? '#f59e0b' : '#ef4444';

  // Generate GPA history rows
  const gpaHistoryRows = (pastGpa || [])
    .sort((a, b) => {
      const aNum = parseInt(String(a.semester || '').replace(/\D/g, '') || '0');
      const bNum = parseInt(String(b.semester || '').replace(/\D/g, '') || '0');
      return aNum - bNum;
    })
    .map(entry => `
      <tr>
        <td style="padding: 8px 16px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">${entry.semester}</td>
        <td style="padding: 8px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: ${entry.gpa >= 3.5 ? '#10b981' : entry.gpa >= 2.5 ? '#f59e0b' : '#ef4444'};">${entry.gpa.toFixed(2)}</td>
      </tr>
    `).join('');

  // Generate courses list
  const coursesList = (courses || []).map(c => `
    <div style="display: inline-block; background: #f1f5f9; border-radius: 8px; padding: 6px 14px; margin: 4px; font-size: 13px; color: #475569;">
      ${c.name} ${c.courseCode ? `(${c.courseCode})` : ''}
    </div>
  `).join('');

  // Parse AI analysis sections
  const renderAISection = (title, content, emoji) => {
    if (!content) return '';
    return `
      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #1e293b;">${emoji} ${title}</h3>
        <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">${content}</p>
      </div>
    `;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student Performance Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 640px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
      <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 10px 16px; margin-bottom: 16px;">
        <span style="font-size: 28px;">📊</span>
      </div>
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Weekly Performance Report</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">AI-Powered Analysis • ${reportDate}</p>
    </div>

    <!-- Main Content -->
    <div style="background: #ffffff; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); padding: 32px;">
      
      <!-- Student Info -->
      <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
        <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b;">Hello, ${studentName}! 👋</p>
        <p style="margin: 6px 0 0; font-size: 14px; color: #64748b;">Student ID: ${studentId}</p>
      </div>

      <!-- Key Metrics -->
      <div style="margin-bottom: 28px;">
        <h2 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">📈 Key Metrics</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td width="50%" style="padding: 8px;">
              <div style="background: linear-gradient(135deg, ${gpaColor}15, ${gpaColor}08); border: 1px solid ${gpaColor}30; border-radius: 12px; padding: 20px; text-align: center;">
                <p style="margin: 0; font-size: 32px; font-weight: 800; color: ${gpaColor};">${gpa.toFixed(2)}</p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Current GPA</p>
              </div>
            </td>
            <td width="50%" style="padding: 8px;">
              <div style="background: linear-gradient(135deg, ${attendanceColor}15, ${attendanceColor}08); border: 1px solid ${attendanceColor}30; border-radius: 12px; padding: 20px; text-align: center;">
                <p style="margin: 0; font-size: 32px; font-weight: 800; color: ${attendanceColor};">${attendance.toFixed(0)}%</p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Attendance</p>
              </div>
            </td>
          </tr>
        </table>
      </div>

      ${pastGpa && pastGpa.length > 0 ? `
      <!-- GPA History -->
      <div style="margin-bottom: 28px;">
        <h2 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">📚 GPA History</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 10px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Semester</th>
              <th style="padding: 10px 16px; text-align: right; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">GPA</th>
            </tr>
          </thead>
          <tbody>
            ${gpaHistoryRows}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${courses && courses.length > 0 ? `
      <!-- Enrolled Courses -->
      <div style="margin-bottom: 28px;">
        <h2 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">🎓 Enrolled Courses</h2>
        <div style="line-height: 2;">
          ${coursesList}
        </div>
      </div>
      ` : ''}

      <!-- AI Analysis -->
      <div style="margin-bottom: 24px; background: linear-gradient(135deg, #eff6ff, #f5f3ff); border: 1px solid #c7d2fe; border-radius: 12px; padding: 24px;">
        <div style="display: flex; align-items: center; margin-bottom: 16px;">
          <span style="font-size: 20px; margin-right: 8px;">🤖</span>
          <h2 style="margin: 0; font-size: 17px; font-weight: 700; color: #3730a3;">AI Performance Analysis</h2>
        </div>
        
        ${renderAISection('Overall Summary', aiAnalysis?.overallSummary, '📋')}
        ${renderAISection('Strengths', aiAnalysis?.strengths, '💪')}
        ${renderAISection('Areas for Improvement', aiAnalysis?.areasForImprovement, '🎯')}
        ${renderAISection('Recommendations', aiAnalysis?.recommendations, '💡')}
        ${renderAISection('GPA Trend Analysis', aiAnalysis?.gpaTrendAnalysis, '📊')}
        ${renderAISection('Attendance Insights', aiAnalysis?.attendanceInsights, '📅')}
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0; font-size: 13px; color: #94a3b8;">Sent by <strong style="color: #6366f1;">${teacherName}</strong></p>
        <p style="margin: 6px 0 0; font-size: 12px; color: #cbd5e1;">This report was generated using AI-powered analysis. For any queries, please contact your instructor.</p>
        <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px;">
          <p style="margin: 0; font-size: 11px; color: #94a3b8;">⚡ Powered by Student Portal AI</p>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`;
};

/**
 * Send report email to a student
 * @param {Object} params
 * @param {string} params.to - Student email
 * @param {string} params.studentName - Student name
 * @param {Object} params.reportData - Full report data
 * @returns {Promise<Object>} Resend response
 */
const sendReportEmail = async ({ to, studentName, reportData }) => {
  const resend = getResendClient();
  const html = generateReportEmail(reportData);

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Student Portal <onboarding@resend.dev>',
    to: [to],
    subject: `📊 Weekly Performance Report — ${studentName}`,
    html,
  });

  if (error) {
    console.error('[EMAIL ERROR]', error);
    throw new Error(error.message || 'Failed to send email');
  }

  return data;
};

module.exports = { sendReportEmail, generateReportEmail };
