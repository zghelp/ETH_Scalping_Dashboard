interface SignalProps {
  time: number
  price: number
  long_score: number
  short_score: number
  take_profit: number
  stop_loss: number
  isLoading: boolean
  error: any
}

export default function SignalCard(props: SignalProps) {
  if (props.isLoading) return <div className="p-4">📡 正在分析最新行情...</div>
  if (props.error) return <div className="p-4 text-red-500">❌ 获取信号失败</div>

  const timeStr = props.time
    ? new Date(props.time).toLocaleString('zh-CN', { hour12: false })
    : '--'

  return (
    <div className="bg-white shadow-md rounded p-4 mt-4">
      <h2 className="text-lg font-semibold mb-2">📊 策略评分与信号明细</h2>
      <p className="text-sm text-gray-500 mb-2">🕒 数据时间：{timeStr}</p>
      <div className="space-y-1 text-sm">
        <p>📈 当前价格：${props.price}</p>
        <p>🟢 多头评分：{props.long_score}</p>
        <p>🔴 空头评分：{props.short_score}</p>
        <p>🎯 策略止盈价：${props.take_profit}</p>
        <p>🛡️ 策略止损价：${props.stop_loss}</p>
      </div>
    </div>
  )
}