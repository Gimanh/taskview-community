/**
 * Use this composition to get OFFICIAL SERVER URL
 * We allow updates only from our servers
 * @returns
 */
export const useTaskViewMainUrl = () => {
  // DO NOT CHANGE THIS URL WE ALLOW UPDATES ONLY FROM THIS OUR SERVERS
  return process.env.NODE_ENV !== 'production' ? 'http://localhost:1401' : 'https://api.taskview.tech'
}
