export const ProgressBar: React.FC<{
  className?: string
  width: number | string
  color: string
}> = ({ className = "", width, color, children }) => (
  <div className={`bg-gray-300 h-1 box-content relative ` + className}>
    <div
      className="absolute h-full box-content"
      style={{
        backgroundColor: color,
        width: width + "%",
      }}
    ></div>
    {children}
  </div>
)
