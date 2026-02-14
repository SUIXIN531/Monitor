import React from 'react'

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
      color: '#e2e8f0'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem', color: '#60a5fa' }}>
        监控器
      </h1>
      <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
        Binance 资金费率监控 App
      </p>
      <div style={{
        background: '#1e293b',
        padding: '1.5rem',
        borderRadius: '12px',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <p style={{ fontSize: '1.2rem' }}>
          测试渲染成功！<br />
          如果你看到这个页面，说明 Vite 本地打包已生效，<br />
          下一步可以添加真实资金费率数据。
        </p>
      </div>
    </div>
  )
}

export default App
