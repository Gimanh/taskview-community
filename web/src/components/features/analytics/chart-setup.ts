import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  RadarController,
  RadialLinearScale,
  TimeScale,
  Title,
  Tooltip,
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'

let registered = false

export function registerChartJs() {
  if (registered) return
  registered = true

  Chart.register(
    LineController,
    BarController,
    DoughnutController,
    RadarController,
    CategoryScale,
    LinearScale,
    TimeScale,
    RadialLinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    Title,
    Filler,
    annotationPlugin,
  )
}
