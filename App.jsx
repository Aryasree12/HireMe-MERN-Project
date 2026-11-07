import React, { useEffect, useMemo, useState } from 'react';
import {
  Link,
  NavLink,
  Route,
  Routes,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { initialJobs, demoUser } from './data.js';

const JOBS_KEY = 'hireme_demo_jobs';
const USER_KEY = 'hireme_demo_user';
const APPS_KEY = 'hireme_demo_applications';
const SESSION_KEY = 'hireme_demo_session';

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => readJSON(key, initial));
  useEffect(() => saveJSON(key, value), [key, value]);
  return [value, setValue];
}
function initials(name = 'HireMe') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0])
    .join('')
    .toUpperCase();
}
function Icon({ name }) {
  const icons = {
    grid: '▦',
    briefcase: '▣',
    user: '♙',
    file: '▤',
    compass: '⌖',
    logout: '↪',
    bell: '♧',
    search: '⌕',
    arrow: '↗',
    plus: '+',
    check: '✓',
    menu: '☰',
    close: '×',
    spark: '✦',
    chart: '▥',
    settings: '⚙',
    building: '▥',
    calendar: '▦',
    pin: '⌖',
  };
  return (
    <span className="icon" aria-hidden="true">
      {icons[name] || '•'}
    </span>
  );
}
function Brand({ light = false }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand-light' : ''}`}>
      <span className="brand-mark">h</span>
      <span>
        hire<span className="brand-accent">me</span>
      </span>
    </Link>
  );
}
function Avatar({ name, small = false }) {
  return (
    <span className={`avatar ${small ? 'avatar-small' : ''}`}>
      {initials(name)}
    </span>
  );
}
function Badge({ children, tone = 'purple' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
function PageTitle({ eyebrow, title, description, action }) {
  return (
    <div className="page-title-row">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action && <div className="page-title-action">{action}</div>}
    </div>
  );
}
function EmptyState({ title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name="file" />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

function App() {
  const [jobs, setJobs] = usePersistentState(JOBS_KEY, initialJobs);
  const [user, setUser] = usePersistentState(USER_KEY, demoUser);
  const [applications, setApplications] = usePersistentState(APPS_KEY, []);
  const [session, setSession] = usePersistentState(SESSION_KEY, null);
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const currentUser = session ? { ...user, ...session } : null;
  const isRecruiter = currentUser?.role === 'recruiter';

  function notify(message) {
    setToast(message);
  }
  function login(email, password, role) {
    if (!email.trim() || !password.trim()) {
      notify('Enter your email and password.');
      return false;
    }
    const next = {
      name: email
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase()),
      email,
      role,
    };
    setSession(next);
    setUser(prev => ({
      ...prev,
      ...next,
      headline: role === 'recruiter' ? 'Recruiter' : prev.headline,
    }));
    notify('Welcome to HireMe!');
    navigate(role === 'recruiter' ? '/recruiter' : '/dashboard');
    return true;
  }
  function register(form) {
    const next = { name: form.name, email: form.email, role: form.role };
    setUser(prev => ({ ...prev, ...next }));
    setSession(next);
    notify('Your demo account is ready.');
    navigate(form.role === 'recruiter' ? '/recruiter' : '/dashboard');
  }
  function logout() {
    setSession(null);
    notify('You have logged out.');
    navigate('/');
  }
  function apply(job, coverNote = '') {
    if (!currentUser) {
      navigate('/login');
      notify('Please log in to apply.');
      return;
    }
    if (currentUser.role !== 'student') {
      notify('Student accounts can apply for jobs.');
      return;
    }
    if (
      applications.some(
        a => a.jobId === job.id && a.email === currentUser.email
      )
    ) {
      notify('You have already applied for this job.');
      return;
    }
    setApplications(prev => [
      {
        id: `app-${Date.now()}`,
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        email: currentUser.email,
        name: currentUser.name,
        appliedAt: new Date().toISOString(),
        status: 'Applied',
        coverNote,
      },
      ...prev,
    ]);
    notify('Application submitted successfully.');
    navigate('/applications');
  }
  function updateStatus(appId, status) {
    setApplications(prev =>
      prev.map(a => (a.id === appId ? { ...a, status } : a))
    );
    notify(`Application status updated to ${status}.`);
  }
  function postJob(job) {
    setJobs(prev => [
      {
        ...job,
        id: `job-${Date.now()}`,
        postedBy: currentUser?.email,
        posted: 'Just now',
      },
      ...prev,
    ]);
    notify('Job posted successfully.');
    navigate('/recruiter');
  }
  function deleteJob(id) {
    setJobs(prev => prev.filter(j => j.id !== id));
    notify('Job removed.');
  }
  function updateUser(changes) {
    setUser(prev => ({ ...prev, ...changes }));
    notify('Profile saved.');
  }

  const shared = {
    jobs,
    setJobs,
    user: currentUser || user,
    applications,
    setApplications,
    session: currentUser,
    apply,
    notify,
    updateStatus,
    postJob,
    deleteJob,
    updateUser,
    logout,
    login,
    register,
    isRecruiter,
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing {...shared} />} />
        <Route path="/login" element={<AuthPage mode="login" {...shared} />} />
        <Route
          path="/register"
          element={<AuthPage mode="register" {...shared} />}
        />
        <Route
          element={
            <AppShell
              {...shared}
              mobileOpen={mobileOpen}
              setMobileOpen={setMobileOpen}
            />
          }
        >
          <Route path="/dashboard" element={<StudentDashboard {...shared} />} />
          <Route path="/profile" element={<ProfilePage {...shared} />} />
          <Route path="/portfolio" element={<PortfolioPage {...shared} />} />
          <Route path="/jobs" element={<JobsPage {...shared} />} />
          <Route
            path="/applications"
            element={<ApplicationsPage {...shared} />}
          />
          <Route
            path="/recruiter"
            element={<RecruiterDashboard {...shared} />}
          />
          <Route path="/post-job" element={<PostJobPage {...shared} />} />
          <Route path="/applicants" element={<ApplicantsPage {...shared} />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      {toast && (
        <div className="toast">
          <span className="toast-check">✓</span>
          {toast}
        </div>
      )}
    </>
  );
}

function Landing({ session }) {
  return (
    <div className="landing">
      <header className="public-nav wrap">
        <Brand />
        <nav>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="nav-actions">
          {session ? (
            <Link
              className="btn btn-primary"
              to={session.role === 'recruiter' ? '/recruiter' : '/dashboard'}
            >
              Open dashboard <Icon name="arrow" />
            </Link>
          ) : (
            <>
              <Link className="btn btn-quiet" to="/login">
                Log in
              </Link>
              <Link className="btn btn-primary" to="/register">
                Get started <Icon name="arrow" />
              </Link>
            </>
          )}
        </div>
      </header>
      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="hero-pill">
              <span className="pulse-dot"></span> Your next chapter starts here
            </div>
            <h1>
              Make your talent
              <br /> <span className="gradient-text">impossible to miss.</span>
            </h1>
            <p className="hero-sub">
              Build a portfolio that tells your story, discover opportunities
              that fit your ambition, and take the next step in your career.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Create your profile <Icon name="arrow" />
              </Link>
              <Link to="/jobs" className="btn btn-outline btn-lg">
                Explore jobs
              </Link>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack">
                <Avatar name="Maya Lee" />
                <Avatar name="Sam Roy" />
                <Avatar name="Nina Paul" />
              </div>
              <span>
                <strong>Built for your next step</strong>
                <small>Students · Graduates · Recruiters</small>
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-glow"></div>
            <div className="dashboard-preview">
              <div className="preview-top">
                <div className="preview-dots">
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
                <span>YOUR CAREER SPACE</span>
                <span className="preview-live">● LIVE</span>
              </div>
              <div className="preview-welcome">
                <div>
                  <small>MONDAY, OCTOBER 26</small>
                  <h3>
                    Good morning, Alex <span>✦</span>
                  </h3>
                  <p>Ready to make progress today?</p>
                </div>
                <Avatar name="Alex Morgan" />
              </div>
              <div className="preview-stats">
                <div>
                  <span className="stat-symbol purple-symbol">↗</span>
                  <small>Applications</small>
                  <strong>08</strong>
                  <em>+2 this week</em>
                </div>
                <div>
                  <span className="stat-symbol orange-symbol">✦</span>
                  <small>Profile strength</small>
                  <strong>82%</strong>
                  <div className="mini-progress">
                    <span></span>
                  </div>
                </div>
              </div>
              <div className="preview-section-head">
                <strong>Recommended for you</strong>
                <span>View all ↗</span>
              </div>
              <div className="preview-job">
                <div className="company-logo logo-purple">P</div>
                <div>
                  <strong>Frontend Developer</strong>
                  <small>Pixelwave Studio · Remote</small>
                </div>
                <span className="preview-match">94% match</span>
              </div>
              <div className="preview-job">
                <div className="company-logo logo-orange">N</div>
                <div>
                  <strong>Product Design Intern</strong>
                  <small>Nexa Labs · Hybrid</small>
                </div>
                <span className="preview-match">88% match</span>
              </div>
            </div>
            <div className="floating-note">
              <span className="floating-icon">✓</span>
              <div>
                <strong>You're on their radar!</strong>
                <small>Your profile is looking great</small>
              </div>
            </div>
            <div className="floating-count">
              <span>✦</span>
              <strong>New opportunities</strong>
              <small>Find your next fit</small>
            </div>
          </div>
        </section>
        <section className="trust-strip">
          <div className="wrap trust-inner">
            <span>Everything you need to move forward</span>
            <strong>YOUR PROFILE</strong>
            <i>✦</i>
            <strong>YOUR OPPORTUNITIES</strong>
            <i>✦</i>
            <strong>YOUR NEXT CHAPTER</strong>
          </div>
        </section>
        <section className="features-section wrap" id="features">
          <div className="section-heading">
            <div className="eyebrow">A smarter way to start</div>
            <h2>
              Your career journey,
              <br />
              <span className="gradient-text">all in one place.</span>
            </h2>
            <p>Less juggling tabs. More making progress.</p>
          </div>
          <div className="feature-grid">
            <Feature
              icon="user"
              number="01"
              title="Show your potential"
              text="Create a portfolio with your skills, education, projects, and resume in one polished profile."
            />
            <Feature
              icon="compass"
              number="02"
              title="Find your fit"
              text="Explore jobs and internships with useful search and filters to find opportunities that suit you."
            />
            <Feature
              icon="chart"
              number="03"
              title="Know where you stand"
              text="Keep your applications organized and follow their progress from one simple dashboard."
            />
          </div>
        </section>
        <section className="cta-section wrap" id="how-it-works">
          <div className="cta-card">
            <div>
              <div className="eyebrow light-eyebrow">
                Your future is in motion
              </div>
              <h2>One profile. New possibilities.</h2>
              <p>Start building your next opportunity today.</p>
            </div>
            <Link className="btn btn-white btn-lg" to="/register">
              Join HireMe <Icon name="arrow" />
            </Link>
            <div className="cta-orb"></div>
          </div>
        </section>
      </main>
      <footer className="public-footer wrap">
        <Brand />
        <span>© 2026 HireMe. Built for what comes next.</span>
        <div>
          <a href="#features">Features</a>
          <Link to="/jobs">Explore jobs</Link>
        </div>
      </footer>
    </div>
  );
}
function Feature({ icon, number, title, text }) {
  return (
    <div className="feature-card">
      <div className="feature-top">
        <span className="feature-icon">
          <Icon name={icon} />
        </span>
        <span className="feature-number">{number}</span>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <span className="feature-arrow">↗</span>
    </div>
  );
}

function AuthPage({ mode, login, register }) {
  const isRegister = mode === 'register';
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.password.length < 4) {
      setError('Password must be at least 4 characters for this demo.');
      return;
    }
    if (isRegister && !form.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (isRegister) register(form);
    else login(form.email, form.password, form.role);
  }
  return (
    <div className="auth-layout">
      <div className="auth-left">
        <Brand light />
        <div className="auth-message">
          <div className="hero-pill hero-pill-light">
            <span className="pulse-dot"></span> Your next chapter starts here
          </div>
          <h1>
            Small steps.
            <br />
            <span>Big possibilities.</span>
          </h1>
          <p>
            Bring your skills, your story, and your ambitions together. Your
            next opportunity starts with one step.
          </p>
          <div className="auth-quote">
            <span>“</span>
            <p>Your future isn't a place you find. It's something you build.</p>
          </div>
        </div>
        <div className="auth-bottom">
          © 2026 HireMe · Made for your next move
        </div>
        <div className="auth-orb"></div>
      </div>
      <div className="auth-right">
        <Link to="/" className="back-home">
          ← Back to home
        </Link>
        <div className="auth-form-wrap">
          <div className="auth-form-heading">
            <div className="eyebrow">
              {isRegister ? 'GET STARTED' : 'WELCOME BACK'}
            </div>
            <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
            <p>
              {isRegister
                ? 'Set up your space and start moving forward.'
                : 'Sign in to pick up where you left off.'}
            </p>
          </div>
          <form onSubmit={submit} className="form-stack">
            {isRegister && (
              <label>
                Full name
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Alex Morgan"
                  autoComplete="name"
                  required
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <div className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter your password"
                  autoComplete={
                    isRegister ? 'new-password' : 'current-password'
                  }
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            {isRegister && (
              <label>
                I'm joining as
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                >
                  <option value="student">Student / Job seeker</option>
                  <option value="recruiter">Recruiter</option>
                </select>
              </label>
            )}
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn-primary btn-full btn-lg" type="submit">
              {isRegister ? 'Create account' : 'Log in'} <Icon name="arrow" />
            </button>
            <p className="demo-note">
              <Icon name="spark" /> Demo mode: any valid email and password (4+
              characters) work. No database required.
            </p>
          </form>
          <div className="auth-switch">
            {isRegister ? 'Already have an account?' : 'New to HireMe?'}{' '}
            <Link to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Log in' : 'Create an account'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppShell({ children, session, user, logout }) {
  const location = useLocation();
  const recruiter = session?.role === 'recruiter';
  const titleMap = {
    '/dashboard': 'Overview',
    '/profile': 'My profile',
    '/portfolio': 'My portfolio',
    '/jobs': 'Find jobs',
    '/applications': 'My applications',
    '/recruiter': 'Recruiter overview',
    '/post-job': 'Post a job',
    '/applicants': 'Applicants',
  };
  const title = titleMap[location.pathname] || 'Workspace';
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand />
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav">
          {recruiter ? (
            <>
              <SideLink to="/recruiter" icon="grid">
                Overview
              </SideLink>
              <SideLink to="/post-job" icon="plus">
                Post a job
              </SideLink>
              <SideLink to="/applicants" icon="user">
                Applicants
              </SideLink>
              <SideLink to="/jobs" icon="briefcase">
                Browse jobs
              </SideLink>
            </>
          ) : (
            <>
              <SideLink to="/dashboard" icon="grid">
                Dashboard
              </SideLink>
              <SideLink to="/jobs" icon="compass">
                Browse jobs
              </SideLink>
              <SideLink to="/applications" icon="file">
                My applications
              </SideLink>
              <SideLink to="/profile" icon="user">
                My profile
              </SideLink>
              <SideLink to="/portfolio" icon="spark">
                My portfolio
              </SideLink>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span>✦</span>
            <strong>Keep moving forward</strong>
            <p>Small improvements make your profile stand out.</p>
            <Link to={recruiter ? '/post-job' : '/profile'}>
              {recruiter ? 'Post an opportunity' : 'Improve profile'} ↗
            </Link>
          </div>
          <button className="sidebar-logout" onClick={logout}>
            <Icon name="logout" /> Log out
          </button>
          <div className="sidebar-user">
            <Avatar name={user?.name || 'User'} small />
            <div>
              <strong>{user?.name || 'Demo User'}</strong>
              <small>
                {recruiter ? 'Recruiter account' : 'Student account'}
              </small>
            </div>
            <span className="user-menu">•••</span>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              onClick={() => document.body.classList.toggle('sidebar-open')}
              aria-label="Toggle navigation"
            >
              <Icon name="menu" />
            </button>
            <div>
              <span className="breadcrumb">
                Workspace <span>/</span> {title}
              </span>
              <strong>{title}</strong>
            </div>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">
              <span className="online-dot"></span> Demo workspace
            </span>
            <button className="icon-button" title="Notifications">
              <Icon name="bell" />
            </button>
            <Avatar name={user?.name || 'User'} small />
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>© 2026 HireMe</span>
          <span>
            Build your next chapter <b>✦</b>
          </span>
        </footer>
      </div>
    </div>
  );
}
function SideLink({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
    >
      <Icon name={icon} />
      <span>{children}</span>
      {to === '/applications' && <span className="side-link-dot"></span>}
    </NavLink>
  );
}

function StudentDashboard({ user, jobs, applications }) {
  const myApps = applications.filter(a => a.email === user.email);
  const recentJobs = jobs.slice(0, 3);
  const completed = [
    user.bio,
    user.location,
    user.skills?.length,
    user.education?.length,
    user.projects?.length,
  ].filter(Boolean).length;
  const strength = Math.round((completed / 5) * 100);
  const hour = new Date().getHours();

  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="page-stack">
      <div className="welcome-banner">
        <div>
          <div className="eyebrow light-eyebrow">YOUR CAREER SPACE</div>
          <h1>
            {greeting}, {user.name?.split(' ')[0] || 'there'}
          </h1>
          <p>Every step counts. Here's what's happening with your journey.</p>
        </div>
        <div className="welcome-art">
          <div className="art-ring ring-one"></div>
          <div className="art-ring ring-two"></div>
          <span>✦</span>
        </div>
      </div>
      <div className="stat-grid">
        <StatCard
          label="Applications sent"
          value={myApps.length.toString().padStart(2, '0')}
          note="Your journey in motion"
          icon="file"
          tone="purple"
        />
        <StatCard
          label="Shortlisted"
          value={myApps
            .filter(a => a.status === 'Shortlisted')
            .length.toString()
            .padStart(2, '0')}
          note="You're on their radar"
          icon="spark"
          tone="orange"
        />
        <StatCard
          label="Profile strength"
          value={`${strength}%`}
          note={strength >= 80 ? 'Looking great!' : 'Room to grow'}
          icon="user"
          tone="blue"
          progress={strength}
        />
        <StatCard
          label="Open opportunities"
          value={jobs.length.toString().padStart(2, '0')}
          note="Ready to explore"
          icon="briefcase"
          tone="green"
        />
      </div>
      <div className="content-grid dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recommended opportunities</h2>
              <p>Roles to help you take the next step.</p>
            </div>
            <Link className="text-link" to="/jobs">
              Explore all <Icon name="arrow" />
            </Link>
          </div>
          <div className="job-list compact-list">
            {recentJobs.map(job => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        </section>
        <section className="panel profile-progress-panel">
          <div className="panel-heading">
            <div>
              <h2>Your profile</h2>
              <p>Make a great first impression.</p>
            </div>
            <span className="panel-heading-icon">
              <Icon name="spark" />
            </span>
          </div>
          <div className="profile-progress">
            <div
              className="progress-ring"
              style={{ '--progress': `${strength}%` }}
            >
              <div>
                <strong>{strength}%</strong>
                <small>complete</small>
              </div>
            </div>
            <p>
              {strength >= 80
                ? 'Your profile is looking strong.'
                : 'A complete profile helps recruiters understand your potential.'}
            </p>
          </div>
          <div className="checklist">
            <CheckItem done={Boolean(user.bio)} text="Add a short bio" />
            <CheckItem
              done={Boolean(user.skills?.length)}
              text="Add your skills"
            />
            <CheckItem
              done={Boolean(user.education?.length)}
              text="Add education details"
            />
            <CheckItem
              done={Boolean(user.projects?.length)}
              text="Showcase a project"
            />
          </div>
          <Link to="/profile" className="btn btn-outline btn-full">
            Complete profile <Icon name="arrow" />
          </Link>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Application activity</h2>
            <p>Keep an eye on your recent applications.</p>
          </div>
          <Link className="text-link" to="/applications">
            View applications <Icon name="arrow" />
          </Link>
        </div>
        {myApps.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>POSITION</th>
                  <th>COMPANY</th>
                  <th>APPLIED ON</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {myApps.slice(0, 4).map(app => (
                  <tr key={app.id}>
                    <td>
                      <strong>{app.title}</strong>
                    </td>
                    <td>{app.company}</td>
                    <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
                    <td>
                      <StatusBadge status={app.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Your story starts with an application"
            text="Find a role that interests you and apply when you're ready."
            action={
              <Link to="/jobs" className="btn btn-primary">
                Browse jobs <Icon name="arrow" />
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
function StatCard({ label, value, note, icon, tone, progress }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon stat-${tone}`}>
        <Icon name={icon} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
      {progress !== undefined && (
        <div className="stat-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
function CheckItem({ done, text }) {
  return (
    <div className={`check-item ${done ? 'check-done' : ''}`}>
      <span>{done ? '✓' : ''}</span>
      {text}
    </div>
  );
}
function JobRow({ job }) {
  return (
    <Link className="job-row" to={`/jobs?job=${encodeURIComponent(job.id)}`}>
      <CompanyMark company={job.company} />
      <div className="job-row-main">
        <strong>{job.title}</strong>
        <span>
          {job.company} <i>·</i> {job.location}
        </span>
        <div className="job-tags">
          <Badge tone="neutral">{job.type}</Badge>
          <Badge tone="green">{job.mode}</Badge>
        </div>
      </div>
      <div className="job-row-side">
        <strong>{job.salary}</strong>
        <span>{job.posted}</span>
        <span className="row-arrow">↗</span>
      </div>
    </Link>
  );
}
function CompanyMark({ company = 'Company' }) {
  const colors = ['purple', 'orange', 'blue', 'green'];
  const color = colors[(company.charCodeAt(0) || 0) % colors.length];
  return (
    <span className={`company-mark mark-${color}`}>
      {company.slice(0, 1).toUpperCase()}
    </span>
  );
}
function StatusBadge({ status }) {
  const tone =
    status === 'Shortlisted'
      ? 'green'
      : status === 'Rejected'
        ? 'red'
        : status === 'Reviewed'
          ? 'blue'
          : 'purple';
  return (
    <Badge tone={tone}>
      <span className="status-dot"></span>
      {status}
    </Badge>
  );
}

function JobsPage({ jobs, apply, session, applications }) {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('All locations');
  const [type, setType] = useState('All types');
  const [selected, setSelected] = useState(null);
  const mine = applications.filter(a => a.email === session?.email);
  const filtered = useMemo(
    () =>
      jobs.filter(job => {
        const text =
          `${job.title} ${job.company} ${job.location} ${(job.skills || []).join(' ')}`.toLowerCase();
        return (
          text.includes(search.toLowerCase()) &&
          (location === 'All locations' ||
            job.location.toLowerCase().includes(location.toLowerCase())) &&
          (type === 'All types' || job.type === type)
        );
      }),
    [jobs, search, location, type]
  );
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="OPPORTUNITIES"
        title="Find your next opportunity"
        description="Explore roles where your skills and ambition can grow."
        action={
          <div className="jobs-count">
            <strong>{filtered.length}</strong> roles found
          </div>
        }
      />
      <div className="search-panel">
        <div className="search-input">
          <Icon name="search" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Job title, company, or skill"
          />
        </div>
        <div className="filter-select">
          <Icon name="pin" />
          <select value={location} onChange={e => setLocation(e.target.value)}>
            <option>All locations</option>
            <option>Kochi</option>
            <option>Thiruvananthapuram</option>
            <option>Thrissur</option>
            <option>Remote</option>
          </select>
        </div>
        <div className="filter-select">
          <Icon name="briefcase" />
          <select value={type} onChange={e => setType(e.target.value)}>
            <option>All types</option>
            <option>Full-time</option>
            <option>Internship</option>
            <option>Part-time</option>
          </select>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setSearch('');
            setLocation('All locations');
            setType('All types');
          }}
        >
          Reset
        </button>
      </div>
      <div className="jobs-layout">
        <div className="jobs-results">
          <div className="results-head">
            <span>
              Showing <strong>{filtered.length}</strong> opportunities
            </span>
            <span className="sort-label">
              Newest first <span>⌄</span>
            </span>
          </div>
          {filtered.length ? (
            filtered.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onSelect={() => setSelected(job)}
                applied={mine.some(a => a.jobId === job.id)}
              />
            ))
          ) : (
            <EmptyState
              title="No matching roles yet"
              text="Try a different keyword or remove one of your filters."
              action={
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setSearch('');
                    setLocation('All locations');
                    setType('All types');
                  }}
                >
                  Clear filters
                </button>
              }
            />
          )}
        </div>
        <aside className="jobs-aside">
          <div className="aside-illustration">
            <div className="aside-spark">✦</div>
            <div className="aside-eyebrow">A LITTLE REMINDER</div>
            <h3>Your next opportunity could be one click away.</h3>
            <p>
              Keep your profile updated so recruiters can see the best of you.
            </p>
            <Link to="/profile" className="btn btn-white btn-full">
              Polish your profile <Icon name="arrow" />
            </Link>
          </div>
          <div className="panel tips-panel">
            <h3>Make your application stand out</h3>
            <div className="tip-line">
              <span>01</span>
              <p>Tailor your profile to the role.</p>
            </div>
            <div className="tip-line">
              <span>02</span>
              <p>Highlight projects and practical skills.</p>
            </div>
            <div className="tip-line">
              <span>03</span>
              <p>Write a thoughtful cover note.</p>
            </div>
          </div>
        </aside>
      </div>
      {selected && (
        <JobModal
          job={selected}
          onClose={() => setSelected(null)}
          onApply={note => {
            apply(selected, note);
            setSelected(null);
          }}
          alreadyApplied={mine.some(a => a.jobId === selected.id)}
          session={session}
        />
      )}
    </div>
  );
}
function JobCard({ job, onSelect, applied }) {
  return (
    <article className="job-card">
      <div className="job-card-top">
        <CompanyMark company={job.company} />
        <div className="job-card-title">
          <h3>{job.title}</h3>
          <p>
            {job.company} <span>·</span> {job.location}
          </p>
        </div>
        <button
          className="save-job"
          title="Save job"
          onClick={e => {
            e.currentTarget.classList.toggle('saved');
            e.currentTarget.textContent = e.currentTarget.classList.contains(
              'saved'
            )
              ? '♥'
              : '♡';
          }}
        >
          ♡
        </button>
      </div>
      <div className="job-card-meta">
        <Badge tone="neutral">{job.type}</Badge>
        <Badge tone="blue">{job.mode || 'Flexible'}</Badge>
        <span className="job-salary">{job.salary}</span>
      </div>
      <p className="job-description">{job.description}</p>
      <div className="job-card-bottom">
        <div className="skill-chips">
          {(job.skills || []).slice(0, 4).map(skill => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
        <button
          className={`btn ${applied ? 'btn-outline' : 'btn-primary'} btn-sm`}
          onClick={onSelect}
        >
          {applied ? 'View details' : 'View role'} <Icon name="arrow" />
        </button>
      </div>
      <div className="job-card-foot">
        <span>
          <Icon name="calendar" /> Deadline: {job.deadline || 'Not specified'}
        </span>
        <span>{job.posted || 'Recently posted'}</span>
      </div>
    </article>
  );
}
function JobModal({ job, onClose, onApply, alreadyApplied, session }) {
  const [note, setNote] = useState('');
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="modal-job-head">
          <CompanyMark company={job.company} />
          <div>
            <h2>{job.title}</h2>
            <p>
              {job.company} · {job.location}
            </p>
          </div>
        </div>
        <div className="job-card-meta">
          <Badge>{job.type}</Badge>
          <Badge tone="blue">{job.mode}</Badge>
          <strong>{job.salary}</strong>
        </div>
        <h3>About this role</h3>
        <p className="modal-description">{job.description}</p>
        <h3>Skills</h3>
        <div className="skill-chips">
          {(job.skills || []).map(s => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <label className="modal-note-label">
          Cover note <span>(optional)</span>
          <textarea
            rows="4"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Tell the recruiter why you're interested in this role..."
          />
        </label>
        {alreadyApplied ? (
          <button className="btn btn-outline btn-full" disabled>
            You've already applied
          </button>
        ) : (
          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={() => onApply(note)}
          >
            Submit application <Icon name="arrow" />
          </button>
        )}
        {!session && (
          <p className="muted small-text">
            You'll be asked to log in before your application can be saved.
          </p>
        )}
      </div>
    </div>
  );
}

function ApplicationsPage({ applications, session, jobs }) {
  const [filter, setFilter] = useState('All');
  const mine = applications.filter(a => a.email === session?.email);
  const filtered = mine.filter(a => filter === 'All' || a.status === filter);
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="YOUR PROGRESS"
        title="My applications"
        description="All your opportunities, organized in one place."
        action={
          <Link to="/jobs" className="btn btn-primary">
            Find jobs <Icon name="arrow" />
          </Link>
        }
      />
      <div className="application-summary">
        <div>
          <span>Total applications</span>
          <strong>{mine.length}</strong>
        </div>
        <div>
          <span>Under review</span>
          <strong>{mine.filter(a => a.status === 'Reviewed').length}</strong>
        </div>
        <div>
          <span>Shortlisted</span>
          <strong>{mine.filter(a => a.status === 'Shortlisted').length}</strong>
        </div>
        <div>
          <span>Not selected</span>
          <strong>{mine.filter(a => a.status === 'Rejected').length}</strong>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Application history</h2>
            <p>Track every step of your job search.</p>
          </div>
          <select
            className="table-filter"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option>All</option>
            <option>Applied</option>
            <option>Reviewed</option>
            <option>Shortlisted</option>
            <option>Rejected</option>
          </select>
        </div>
        {filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ROLE</th>
                  <th>COMPANY</th>
                  <th>DATE APPLIED</th>
                  <th>STATUS</th>
                  <th>PROGRESS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(app => (
                  <tr key={app.id}>
                    <td>
                      <strong>{app.title}</strong>
                      <small className="table-sub">{app.location}</small>
                    </td>
                    <td>{app.company}</td>
                    <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
                    <td>
                      <StatusBadge status={app.status} />
                    </td>
                    <td>
                      <ApplicationSteps status={app.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={
              filter === 'All'
                ? 'Your next chapter starts here'
                : `No ${filter.toLowerCase()} applications`
            }
            text={
              filter === 'All'
                ? 'When you apply for a role, it will appear here so you can follow its progress.'
                : 'Try another status filter to see your applications.'
            }
            action={
              <Link to="/jobs" className="btn btn-primary">
                Explore opportunities <Icon name="arrow" />
              </Link>
            }
          />
        )}
      </section>
      <div className="info-banner">
        <span>✦</span>
        <div>
          <strong>A little encouragement</strong>
          <p>
            Every application is progress. Keep your profile current and
            continue exploring roles that interest you.
          </p>
        </div>
      </div>
    </div>
  );
}
function ApplicationSteps({ status }) {
  const stages = ['Applied', 'Reviewed', 'Shortlisted'];
  if (status === 'Rejected')
    return <span className="progress-rejected">Closed</span>;
  const current = stages.indexOf(status);
  return (
    <div className="steps-mini">
      {stages.map((s, i) => (
        <span
          key={s}
          className={i <= current ? 'step-on' : ''}
          title={s}
        ></span>
      ))}
    </div>
  );
}

function ProfilePage({ user, updateUser }) {
  const [form, setForm] = useState(() => ({
    ...user,
    skillsText: (user.skills || []).join(', '),
    education: user.education || [],
    projects: user.projects || [],
  }));
  const [skillInput, setSkillInput] = useState('');
  useEffect(
    () =>
      setForm({
        ...user,
        skillsText: (user.skills || []).join(', '),
        education: user.education || [],
        projects: user.projects || [],
      }),
    [user]
  );
  function submit(e) {
    e.preventDefault();
    updateUser({
      name: form.name,
      headline: form.headline,
      location: form.location,
      bio: form.bio,
      github: form.github,
      linkedin: form.linkedin,
      skills: form.skillsText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      education: form.education,
    });
  }
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="YOUR PERSONAL BRAND"
        title="My profile"
        description="Help recruiters understand who you are and what you bring."
        action={
          <Link to="/portfolio" className="btn btn-outline">
            Preview portfolio <Icon name="arrow" />
          </Link>
        }
      />
      <div className="profile-layout">
        <aside className="panel profile-card">
          <div className="profile-cover">
            <div className="cover-shape cover-shape-one"></div>
            <div className="cover-shape cover-shape-two"></div>
          </div>
          <div className="profile-avatar-wrap">
            <Avatar name={form.name} />
          </div>
          <div className="profile-card-body">
            <h2>{form.name || 'Your name'}</h2>
            <p className="profile-headline">
              {form.headline || 'Add a professional headline'}
            </p>
            <p className="profile-location">
              <Icon name="pin" /> {form.location || 'Add your location'}
            </p>
            <div className="profile-divider"></div>
            <div className="profile-mini-stats">
              <div>
                <strong>
                  {form.skillsText.split(',').filter(s => s.trim()).length}
                </strong>
                <span>Skills</span>
              </div>
              <div>
                <strong>{(form.projects || []).length}</strong>
                <span>Projects</span>
              </div>
              <div>
                <strong>{(form.education || []).length}</strong>
                <span>Education</span>
              </div>
            </div>
            <Link to="/portfolio" className="btn btn-outline btn-full">
              View public portfolio <Icon name="arrow" />
            </Link>
          </div>
        </aside>
        <section className="panel edit-profile-panel">
          <div className="panel-heading">
            <div>
              <h2>Personal information</h2>
              <p>Keep your details clear and up to date.</p>
            </div>
            <span className="panel-heading-icon">
              <Icon name="settings" />
            </span>
          </div>
          <form className="form-stack profile-form" onSubmit={submit}>
            <div className="form-two">
              <label>
                Full name
                <input
                  value={form.name || ''}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Professional headline
                <input
                  value={form.headline || ''}
                  onChange={e => setForm({ ...form, headline: e.target.value })}
                  placeholder="e.g. BCA Graduate | Web Developer"
                />
              </label>
            </div>
            <div className="form-two">
              <label>
                Location
                <input
                  value={form.location || ''}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="City, Country"
                />
              </label>
              <label>
                Email address
                <input
                  value={form.email || ''}
                  readOnly
                  className="readonly-input"
                />
              </label>
            </div>
            <label>
              About you
              <textarea
                rows="4"
                value={form.bio || ''}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                placeholder="Share a short introduction about your interests and goals."
              />
            </label>
            <label>
              Skills{' '}
              <span className="label-hint">Separate skills with commas</span>
              <textarea
                rows="3"
                value={form.skillsText}
                onChange={e => setForm({ ...form, skillsText: e.target.value })}
                placeholder="React, JavaScript, HTML, CSS"
              />
            </label>
            <div className="form-two">
              <label>
                GitHub profile
                <input
                  value={form.github || ''}
                  onChange={e => setForm({ ...form, github: e.target.value })}
                  placeholder="https://github.com/username"
                />
              </label>
              <label>
                LinkedIn profile
                <input
                  value={form.linkedin || ''}
                  onChange={e => setForm({ ...form, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                />
              </label>
            </div>
            <div className="form-section-title">
              <div>
                <h3>Education</h3>
                <p>Add your academic background.</p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() =>
                  setForm({
                    ...form,
                    education: [
                      ...(form.education || []),
                      { degree: '', institute: '', year: '' },
                    ],
                  })
                }
              >
                <Icon name="plus" /> Add education
              </button>
            </div>
            {(form.education || []).map((ed, i) => (
              <div className="education-editor" key={i}>
                <div className="form-two">
                  <label>
                    Degree
                    <input
                      value={ed.degree}
                      onChange={e =>
                        setForm({
                          ...form,
                          education: form.education.map((x, j) =>
                            j === i ? { ...x, degree: e.target.value } : x
                          ),
                        })
                      }
                      placeholder="Degree or qualification"
                    />
                  </label>
                  <label>
                    Institution
                    <input
                      value={ed.institute}
                      onChange={e =>
                        setForm({
                          ...form,
                          education: form.education.map((x, j) =>
                            j === i ? { ...x, institute: e.target.value } : x
                          ),
                        })
                      }
                      placeholder="College or university"
                    />
                  </label>
                </div>
                <div className="education-bottom">
                  <label>
                    Year
                    <input
                      value={ed.year}
                      onChange={e =>
                        setForm({
                          ...form,
                          education: form.education.map((x, j) =>
                            j === i ? { ...x, year: e.target.value } : x
                          ),
                        })
                      }
                      placeholder="2026"
                    />
                  </label>
                  <button
                    type="button"
                    className="text-danger"
                    onClick={() =>
                      setForm({
                        ...form,
                        education: form.education.filter((_, j) => j !== i),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() =>
                  setForm({
                    ...user,
                    skillsText: (user.skills || []).join(', '),
                    education: user.education || [],
                    projects: user.projects || [],
                  })
                }
              >
                Discard changes
              </button>
              <button type="submit" className="btn btn-primary">
                Save profile <Icon name="check" />
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function PortfolioPage({ user }) {
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="YOUR STORY, PRESENTED WELL"
        title="My portfolio"
        description="A shareable snapshot of your skills, experience, and projects."
        action={
          <button
            className="btn btn-outline"
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
          >
            Copy page link <Icon name="arrow" />
          </button>
        }
      />
      <div className="portfolio-preview">
        <div className="portfolio-hero">
          <div className="portfolio-topline">
            <Brand />
            <Badge tone="green">Available for opportunities</Badge>
          </div>
          <div className="portfolio-intro">
            <Avatar name={user.name} />
            <div>
              <div className="eyebrow">HELLO, I'M</div>
              <h1>{user.name}</h1>
              <h2>{user.headline || 'Student & aspiring professional'}</h2>
              <p>
                {user.bio ||
                  'Add a short bio to tell people about your interests, strengths, and career goals.'}
              </p>
              <div className="portfolio-links">
                {user.github && (
                  <a href={user.github} target="_blank" rel="noreferrer">
                    GitHub ↗
                  </a>
                )}
                {user.linkedin && (
                  <a href={user.linkedin} target="_blank" rel="noreferrer">
                    LinkedIn ↗
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="portfolio-decor">✦</div>
        </div>
        <div className="portfolio-content">
          <section>
            <div className="eyebrow">WHAT I BRING</div>
            <h2>Skills & strengths</h2>
            <div className="portfolio-skills">
              {(user.skills || []).length ? (
                user.skills.map(s => <span key={s}>{s}</span>)
              ) : (
                <p className="muted">Add your skills in My Profile.</p>
              )}
            </div>
          </section>
          <section>
            <div className="eyebrow">THE JOURNEY SO FAR</div>
            <h2>Education</h2>
            {(user.education || []).length ? (
              user.education.map((ed, i) => (
                <div className="portfolio-timeline" key={i}>
                  <span className="timeline-dot"></span>
                  <div>
                    <h3>{ed.degree || 'Qualification'}</h3>
                    <p>
                      {ed.institute || 'Institution'} <span>·</span> {ed.year}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">Add your education details in My Profile.</p>
            )}
          </section>
          <section>
            <div className="eyebrow">SELECTED WORK</div>
            <h2>Projects</h2>
            <div className="portfolio-project-grid">
              {(user.projects || []).length ? (
                user.projects.map((p, i) => (
                  <div className="portfolio-project" key={i}>
                    <div className={`project-visual project-visual-${i % 3}`}>
                      <span>{['⌘', '✦', '↗'][i % 3]}</span>
                    </div>
                    <div>
                      <h3>{p.name}</h3>
                      <p>{p.description}</p>
                      {p.link && (
                        <a href={p.link} target="_blank" rel="noreferrer">
                          View project ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">
                  Add project information to showcase your work.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
      <div className="portfolio-note">
        <span>✦</span>
        <p>
          This is a demo portfolio preview. Profile changes are saved in this
          browser only.
        </p>
        <Link to="/profile">Edit portfolio content ↗</Link>
      </div>
    </div>
  );
}

function RecruiterDashboard({ jobs, applications, user, deleteJob }) {
  const myJobs = jobs.filter(j => !j.postedBy || j.postedBy === user.email);
  const jobIds = new Set(myJobs.map(j => j.id));
  const myApps = applications.filter(a => jobIds.has(a.jobId));
  return (
    <div className="page-stack">
      <div className="welcome-banner recruiter-banner">
        <div>
          <div className="eyebrow light-eyebrow">RECRUITER WORKSPACE</div>
          <h1>
            Let's find your next great hire. <span>✦</span>
          </h1>
          <p>
            Manage opportunities and connect with people ready to make an
            impact.
          </p>
          <Link to="/post-job" className="btn btn-white">
            Post a new job <Icon name="arrow" />
          </Link>
        </div>
        <div className="welcome-art">
          <div className="art-ring ring-one"></div>
          <div className="art-ring ring-two"></div>
          <span>♧</span>
        </div>
      </div>
      <div className="stat-grid">
        <StatCard
          label="Active job posts"
          value={myJobs.length.toString().padStart(2, '0')}
          note="Opportunities listed"
          icon="briefcase"
          tone="purple"
        />
        <StatCard
          label="Total applicants"
          value={myApps.length.toString().padStart(2, '0')}
          note="People interested"
          icon="user"
          tone="blue"
        />
        <StatCard
          label="Shortlisted"
          value={myApps
            .filter(a => a.status === 'Shortlisted')
            .length.toString()
            .padStart(2, '0')}
          note="Potential matches"
          icon="spark"
          tone="green"
        />
        <StatCard
          label="Awaiting review"
          value={myApps
            .filter(a => a.status === 'Applied')
            .length.toString()
            .padStart(2, '0')}
          note="Ready for your review"
          icon="file"
          tone="orange"
        />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Your job postings</h2>
            <p>Keep your opportunities up to date.</p>
          </div>
          <Link to="/post-job" className="btn btn-primary btn-sm">
            <Icon name="plus" /> Post a job
          </Link>
        </div>
        {myJobs.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>JOB TITLE</th>
                  <th>LOCATION</th>
                  <th>TYPE</th>
                  <th>APPLICANTS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {myJobs.map(job => (
                  <tr key={job.id}>
                    <td>
                      <strong>{job.title}</strong>
                      <small className="table-sub">{job.company}</small>
                    </td>
                    <td>{job.location}</td>
                    <td>
                      <Badge tone="neutral">{job.type}</Badge>
                    </td>
                    <td>
                      <strong>
                        {applications.filter(a => a.jobId === job.id).length}
                      </strong>
                    </td>
                    <td>
                      <button
                        className="table-action"
                        onClick={() => deleteJob(job.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Your first opportunity starts here"
            text="Create a job post to invite candidates to apply."
            action={
              <Link to="/post-job" className="btn btn-primary">
                Post a job
              </Link>
            }
          />
        )}
      </section>
      <div className="info-banner">
        <span>✦</span>
        <div>
          <strong>Thoughtful hiring starts with a clear role</strong>
          <p>
            Include responsibilities, required skills, location, and an
            application deadline to help candidates decide if the role is right
            for them.
          </p>
        </div>
      </div>
    </div>
  );
}
function PostJobPage({ postJob, user }) {
  const [form, setForm] = useState({
    title: '',
    company: '',
    location: '',
    type: 'Full-time',
    mode: 'Hybrid',
    salary: '',
    category: 'Development',
    deadline: '',
    skills: '',
    description: '',
  });
  const [error, setError] = useState('');
  function submit(e) {
    e.preventDefault();
    if (
      !form.title.trim() ||
      !form.company.trim() ||
      !form.location.trim() ||
      !form.description.trim()
    ) {
      setError('Please complete all required fields.');
      return;
    }
    postJob({
      ...form,
      skills: form.skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      postedBy: user.email,
    });
  }
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="GROW YOUR TEAM"
        title="Post a new job"
        description="Share an opportunity and find people excited to do meaningful work."
        action={
          <Link to="/recruiter" className="btn btn-outline">
            ← Back to dashboard
          </Link>
        }
      />
      <div className="post-layout">
        <section className="panel post-form-panel">
          <form className="form-stack" onSubmit={submit}>
            <div className="form-section-title">
              <div>
                <h3>Role details</h3>
                <p>Start with the essentials candidates need to know.</p>
              </div>
              <Badge>Step 1 of 1</Badge>
            </div>
            <label>
              Job title *
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Junior Frontend Developer"
                required
              />
            </label>
            <div className="form-two">
              <label>
                Company name *
                <input
                  value={form.company}
                  onChange={e => setForm({ ...form, company: e.target.value })}
                  placeholder="Your company"
                  required
                />
              </label>
              <label>
                Location *
                <input
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="City or Remote"
                  required
                />
              </label>
            </div>
            <div className="form-three">
              <label>
                Employment type
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  <option>Full-time</option>
                  <option>Internship</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                </select>
              </label>
              <label>
                Work mode
                <select
                  value={form.mode}
                  onChange={e => setForm({ ...form, mode: e.target.value })}
                >
                  <option>Hybrid</option>
                  <option>Remote</option>
                  <option>On-site</option>
                </select>
              </label>
              <label>
                Salary range
                <input
                  value={form.salary}
                  onChange={e => setForm({ ...form, salary: e.target.value })}
                  placeholder="e.g. ₹3–5 LPA"
                />
              </label>
            </div>
            <label>
              Job description *
              <textarea
                rows="6"
                value={form.description}
                onChange={e =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe the role, responsibilities, and what the candidate will learn or contribute."
                required
              />
            </label>
            <div className="form-two">
              <label>
                Required skills{' '}
                <span className="label-hint">Comma separated</span>
                <input
                  value={form.skills}
                  onChange={e => setForm({ ...form, skills: e.target.value })}
                  placeholder="React, JavaScript, CSS"
                />
              </label>
              <label>
                Application deadline
                <input
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm({ ...form, deadline: e.target.value })}
                />
              </label>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="form-actions">
              <Link to="/recruiter" className="btn btn-quiet">
                Cancel
              </Link>
              <button className="btn btn-primary btn-lg" type="submit">
                Publish job <Icon name="arrow" />
              </button>
            </div>
          </form>
        </section>
        <aside className="post-aside">
          <div className="post-aside-icon">✦</div>
          <h3>A great job post attracts great people.</h3>
          <p>
            Clear, welcoming descriptions help candidates understand the
            opportunity and picture themselves on your team.
          </p>
          <div className="post-tip">
            <span>✓</span>
            <div>
              <strong>Be specific</strong>
              <p>Describe the work and skills that matter most.</p>
            </div>
          </div>
          <div className="post-tip">
            <span>✓</span>
            <div>
              <strong>Set expectations</strong>
              <p>Include work mode, location, and salary when possible.</p>
            </div>
          </div>
          <div className="post-tip">
            <span>✓</span>
            <div>
              <strong>Make it welcoming</strong>
              <p>Explain what someone can learn and contribute.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
function ApplicantsPage({ applications, jobs, updateStatus, user }) {
  const [status, setStatus] = useState('All');
  const myJobs = jobs.filter(j => !j.postedBy || j.postedBy === user.email);
  const ids = new Set(myJobs.map(j => j.id));
  const applicants = applications.filter(
    a => ids.has(a.jobId) && (status === 'All' || a.status === status)
  );
  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="HIRING PIPELINE"
        title="Applicants"
        description="Review candidates and keep each application moving."
        action={
          <Link to="/post-job" className="btn btn-primary">
            <Icon name="plus" /> Post a job
          </Link>
        }
      />
      <div className="application-summary">
        <div>
          <span>Total applicants</span>
          <strong>{applications.filter(a => ids.has(a.jobId)).length}</strong>
        </div>
        <div>
          <span>Applied</span>
          <strong>
            {
              applications.filter(
                a => ids.has(a.jobId) && a.status === 'Applied'
              ).length
            }
          </strong>
        </div>
        <div>
          <span>Shortlisted</span>
          <strong>
            {
              applications.filter(
                a => ids.has(a.jobId) && a.status === 'Shortlisted'
              ).length
            }
          </strong>
        </div>
        <div>
          <span>Rejected</span>
          <strong>
            {
              applications.filter(
                a => ids.has(a.jobId) && a.status === 'Rejected'
              ).length
            }
          </strong>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Candidate applications</h2>
            <p>Update statuses to keep candidates informed.</p>
          </div>
          <select
            className="table-filter"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option>All</option>
            <option>Applied</option>
            <option>Reviewed</option>
            <option>Shortlisted</option>
            <option>Rejected</option>
          </select>
        </div>
        {applicants.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CANDIDATE</th>
                  <th>ROLE</th>
                  <th>APPLIED ON</th>
                  <th>STATUS</th>
                  <th>UPDATE STATUS</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div className="candidate-cell">
                        <Avatar name={a.name} small />
                        <div>
                          <strong>{a.name}</strong>
                          <small className="table-sub">{a.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{a.title}</td>
                    <td>{new Date(a.appliedAt).toLocaleDateString()}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td>
                      <select
                        className="status-select"
                        value={a.status}
                        onChange={e => updateStatus(a.id, e.target.value)}
                      >
                        <option>Applied</option>
                        <option>Reviewed</option>
                        <option>Shortlisted</option>
                        <option>Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No candidates to review yet"
            text="When students apply to your job posts, their applications will show up here."
            action={
              <Link to="/post-job" className="btn btn-primary">
                Post your first job
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
function NotFound() {
  return (
    <div className="not-found">
      <Brand />
      <span className="not-found-number">404</span>
      <h1>Looks like this page wandered off.</h1>
      <p>The page you're looking for isn't here.</p>
      <Link className="btn btn-primary" to="/">
        Back to HireMe <Icon name="arrow" />
      </Link>
    </div>
  );
}

export default App;
