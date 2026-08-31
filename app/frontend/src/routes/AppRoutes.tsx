import { ReactNode, Suspense } from "react";
import { createHashRouter, RouteObject, RouterProvider } from "react-router-dom";
import { AppRoute, routeConfig } from "./routeConfig";
import PageLoading from "../components/common/PageLoading";

function withSuspense(node: ReactNode): ReactNode {
    return <Suspense fallback={<PageLoading />}>{node}</Suspense>;
}

function buildRouteObjects(routes: AppRoute[]): RouteObject[] {
    return routes.map(route => {
        const built: RouteObject = {
            path: route.path,
            index: route.index,
            lazy: route.lazy,
            children: route.children ? buildRouteObjects(route.children) : undefined
        } as RouteObject;
        if (route.element) {
            built.element = withSuspense(route.element);
        }
        return built;
    });
}

const router = createHashRouter(buildRouteObjects(routeConfig));

export default function AppRoutes() {
    return <RouterProvider router={router} />;
}
