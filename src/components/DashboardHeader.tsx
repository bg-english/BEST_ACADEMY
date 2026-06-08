interface Props {
  studentCount: number
}

export default function DashboardHeader({ studentCount }: Props) {
  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">👨‍🏫</div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">BEST Academy Dashboard</h1>
            <p className="text-gray-500 text-sm">Real-time student performance</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-semibold">
            {studentCount} Students
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-500">Live</span>
          </div>
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
            Student View
          </a>
        </div>
      </div>
    </header>
  )
}