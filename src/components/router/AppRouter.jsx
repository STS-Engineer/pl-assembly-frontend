import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  startTransition,
  useContext,
  useEffect,
  useState,
} from 'react'

const RouterContext = createContext({
  currentPath: '/',
  navigate: () => {},
})

function normalizePath(pathname) {
  if (!pathname || pathname === '/') {
    return '/'
  }

  return pathname.replace(/\/+$/, '') || '/'
}

export function AppRouter({ children }) {
  const [currentPath, setCurrentPath] = useState(() =>
    normalizePath(window.location.pathname),
  )

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normalizePath(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const navigate = (to) => {
    const nextPath = normalizePath(to)

    if (nextPath === currentPath) {
      return
    }

    window.history.pushState({}, '', nextPath)

    startTransition(() => {
      setCurrentPath(nextPath)
    })
  }

  return (
    <RouterContext.Provider
      value={{
        currentPath,
        navigate,
      }}
    >
      {children}
    </RouterContext.Provider>
  )
}

export function Route() {
  return null
}

function matchRoute(routePath, currentPath) {
  if (routePath === '*') {
    return {}
  }

  const normalizedRoutePath = normalizePath(routePath)
  const normalizedCurrentPath = normalizePath(currentPath)
  const routeSegments = normalizedRoutePath.split('/').filter(Boolean)
  const currentSegments = normalizedCurrentPath.split('/').filter(Boolean)

  if (routeSegments.length !== currentSegments.length) {
    return null
  }

  const params = {}

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index]
    const currentSegment = currentSegments[index]

    if (routeSegment.startsWith(':')) {
      params[routeSegment.slice(1)] = decodeURIComponent(currentSegment)
      continue
    }

    if (routeSegment !== currentSegment) {
      return null
    }
  }

  return params
}

export function RouteSwitch({ children }) {
  const { currentPath } = useRouter()
  const routes = Children.toArray(children).filter(isValidElement)
  const match = routes
    .map((route) => ({
      route,
      params: matchRoute(route.props.path, currentPath),
    }))
    .find((entry) => entry.params !== null)

  if (!match) {
    return null
  }

  const element = match.route.props.element

  if (!isValidElement(element)) {
    return element
  }

  return cloneElement(element, {
    routeParams: match.params,
  })
}

export function useRouter() {
  return useContext(RouterContext)
}

export function RouterLink({
  children,
  className,
  onClick,
  target,
  to,
  ...props
}) {
  const { currentPath, navigate } = useRouter()

  const handleClick = (event) => {
    onClick?.(event)

    if (
      event.defaultPrevented ||
      target === '_blank' ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    event.preventDefault()
    navigate(to)
  }

  return (
    <a
      {...props}
      href={to}
      target={target}
      className={className}
      aria-current={normalizePath(to) === currentPath ? 'page' : undefined}
      onClick={handleClick}
    >
      {children}
    </a>
  )
}
