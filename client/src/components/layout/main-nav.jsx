import { Link } from 'react-router-dom'

export function MainNav() {
  const navItems = [
    { title: 'Home', href: '/' },
    { title: 'Flashcards', href: '/flashcards' },
    { title: 'Briefs', href: '/briefs' },
  ]

  return (
    <div className="mr-4 flex">
      <Link to="/" className="mr-6 flex items-center space-x-2">
        <span className="font-bold">StudyHelper</span>
      </Link>
      <nav className="flex items-center space-x-6 text-sm font-medium">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="transition-colors hover:text-foreground/80 text-foreground"
          >
            {item.title}
          </Link>
        ))}
      </nav>
    </div>
  )
} 