import { LocalportConfig } from "./src/utils/config"

export default LocalportConfig({
	ports: {
		CONVEX_DASHBOARD_PORT: {},
		CONVEX_DB_PORT: {},
		CONVEX_ORIGIN_PORT: {},
		VITE_SERVER_PORT: {
			name: "maitri-global"
		}
	}
})
