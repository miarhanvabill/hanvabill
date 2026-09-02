const fs = require('fs');
const file = '/Users/gauravrajpoot/Documents/hanva-billing-5/app/book/[slug]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Interfaces
const interfacesStr = `
interface PortalCustomer {
  id: number
  name: string
  phone: string
  email?: string
  date_of_birth?: string
  date_of_anniversary?: string
  gender?: string
}

interface PortalProfile {
  customer: PortalCustomer
  loyalty: { current_points: number; total_earned: number }
  bookings: any[]
  memberships: any[]
  packages: any[]
  wallet_balance: number
  referral: { code: string; referrals_count: number }
}
`;
content = content.replace(/interface Review {[\s\S]*?}\n/, match => match + '\n' + interfacesStr);

// 2. State Variables
const stateVarsStr = `
// Customer Portal Auth State
const [portalCustomer, setPortalCustomer] = useState<PortalCustomer | null>(null)
const [portalToken, setPortalToken] = useState<string | null>(null)
const [portalProfile, setPortalProfile] = useState<PortalProfile | null>(null)
const [showLoginModal, setShowLoginModal] = useState(false)
const [showProfileDrawer, setShowProfileDrawer] = useState(false)
const [profileTab, setProfileTab] = useState<'profile' | 'loyalty' | 'bookings' | 'memberships' | 'referral'>('loyalty')

// Login Flow State
const [loginStep, setLoginStep] = useState<'phone' | 'otp'>('phone')
const [loginPhone, setLoginPhone] = useState('')
const [loginOTP, setLoginOTP] = useState('')
const [loginLoading, setLoginLoading] = useState(false)
const [loginError, setLoginError] = useState('')
const [otpCountdown, setOtpCountdown] = useState(0)
const [editingProfile, setEditingProfile] = useState(false)
const [profileEditForm, setProfileEditForm] = useState<Partial<PortalCustomer>>({})
const [savingProfile, setSavingProfile] = useState(false)
`;
content = content.replace(/const \[enquirySuccess, setEnquirySuccess\] = useState\(false\)/, match => match + '\n' + stateVarsStr);

// 3. useEffects
const effectsStr = `
// Load saved portal token on mount
useEffect(() => {
  const savedToken = localStorage.getItem(\`portal_token_\${slug}\`)
  const savedCustomer = localStorage.getItem(\`portal_customer_\${slug}\`)
  if (savedToken && savedCustomer) {
    try {
      const customer = JSON.parse(savedCustomer)
      setPortalToken(savedToken)
      setPortalCustomer(customer)
      setCustomerForm(prev => ({
        ...prev,
        name: prev.name || customer.name || '',
        phone: prev.phone || customer.phone || '',
        email: prev.email || customer.email || ''
      }))
    } catch {}
  }
}, [slug])

// Fetch full profile when logged in
useEffect(() => {
  if (!portalToken || !portalCustomer) return
  fetch('/api/public/customer-profile', {
    headers: { 'Authorization': \`Bearer \${portalToken}\` }
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        setPortalProfile(data)
        // Update customer form with saved info
        setCustomerForm(prev => ({
          ...prev,
          name: prev.name || data.customer.full_name || '',
          phone: prev.phone || data.customer.phone_number || '',
          email: prev.email || data.customer.email || ''
        }))
      } else {
        // Token expired
        localStorage.removeItem(\`portal_token_\${slug}\`)
        localStorage.removeItem(\`portal_customer_\${slug}\`)
        setPortalToken(null)
        setPortalCustomer(null)
      }
    })
    .catch(() => {})
}, [portalToken, portalCustomer, slug])

// OTP countdown timer
useEffect(() => {
  if (otpCountdown <= 0) return
  const timer = setInterval(() => setOtpCountdown(prev => prev - 1), 1000)
  return () => clearInterval(timer)
}, [otpCountdown])
`;
content = content.replace(/(}, \[selectedDate, tenantId, step, bookedSlots\])\n/, match => match + '\n' + effectsStr);

// 4. Handlers
const handlersStr = `
const handleSendOTP = async () => {
  if (!loginPhone || loginPhone.replace(/[^0-9]/g, '').length < 10) {
    setLoginError('Please enter a valid 10-digit phone number')
    return
  }
  setLoginLoading(true)
  setLoginError('')
  try {
    const res = await fetch('/api/public/customer-auth/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, phone: loginPhone.replace(/[^0-9]/g, '') })
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to send OTP')
    setLoginStep('otp')
    setOtpCountdown(60)
  } catch (err: any) {
    setLoginError(err.message || 'Failed to send OTP')
  } finally {
    setLoginLoading(false)
  }
}

const handleVerifyOTP = async () => {
  if (!loginOTP || loginOTP.length !== 6) {
    setLoginError('Please enter the 6-digit OTP')
    return
  }
  setLoginLoading(true)
  setLoginError('')
  try {
    const res = await fetch('/api/public/customer-auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, phone: loginPhone.replace(/[^0-9]/g, ''), otp: loginOTP })
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || 'Invalid OTP')
    
    const customer = data.customer
    localStorage.setItem(\`portal_token_\${slug}\`, data.token)
    localStorage.setItem(\`portal_customer_\${slug}\`, JSON.stringify(customer))
    setPortalToken(data.token)
    setPortalCustomer(customer)
    setCustomerForm(prev => ({
      ...prev,
      name: prev.name || customer.name || '',
      phone: prev.phone || customer.phone || '',
      email: prev.email || customer.email || ''
    }))
    setShowLoginModal(false)
    setLoginStep('phone')
    setLoginPhone('')
    setLoginOTP('')
  } catch (err: any) {
    setLoginError(err.message || 'Invalid OTP')
  } finally {
    setLoginLoading(false)
  }
}

const handleLogout = () => {
  localStorage.removeItem(\`portal_token_\${slug}\`)
  localStorage.removeItem(\`portal_customer_\${slug}\`)
  setPortalToken(null)
  setPortalCustomer(null)
  setPortalProfile(null)
  setShowProfileDrawer(false)
}

const handleSaveProfile = async () => {
  if (!portalToken) return
  setSavingProfile(true)
  try {
    const res = await fetch('/api/public/customer-profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${portalToken}\`
      },
      body: JSON.stringify(profileEditForm)
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error)
    // Refresh profile
    setPortalCustomer(prev => prev ? { ...prev, ...profileEditForm } : prev)
    setEditingProfile(false)
  } catch (err: any) {
    alert(err.message || 'Failed to save profile')
  } finally {
    setSavingProfile(false)
  }
}

`;
content = content.replace(/const handleEnquirySubmit = async/, match => handlersStr + match);

// 5 & 6. Modals
const modalsStr = `
const LoginModal = () => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowLoginModal(false); setLoginStep('phone'); setLoginError('') }} />
    <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
      <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700" onClick={() => { setShowLoginModal(false); setLoginStep('phone'); setLoginError('') }}>
        <X className="w-5 h-5" />
      </button>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl">👤</span>
        </div>
        <h2 className="text-2xl font-black">Customer Login</h2>
        <p className="text-gray-500 text-sm mt-1">{loginStep === 'phone' ? 'Enter your phone to receive an OTP on WhatsApp' : \`OTP sent to +\${loginPhone.replace(/[^0-9]/g,'')}\`}</p>
      </div>

      {loginError && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4">{loginError}</div>}

      {loginStep === 'phone' ? (
        <div className="space-y-4">
          <div>
            <Label className="font-semibold">Phone Number</Label>
            <Input
              type="tel"
              placeholder="Enter 10-digit mobile number"
              value={loginPhone}
              onChange={e => setLoginPhone(e.target.value)}
              className="mt-1 h-12 rounded-2xl text-base"
              onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
              autoFocus
            />
          </div>
          <Button onClick={handleSendOTP} disabled={loginLoading} className="w-full h-12 rounded-2xl bg-black hover:bg-gray-800 text-base font-bold">
            {loginLoading ? 'Sending OTP...' : 'Send OTP on WhatsApp 📲'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label className="font-semibold">Enter OTP</Label>
            <Input
              type="number"
              placeholder="6-digit OTP"
              value={loginOTP}
              onChange={e => setLoginOTP(e.target.value.slice(0, 6))}
              className="mt-1 h-14 text-2xl text-center tracking-widest rounded-2xl font-mono"
              onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
              autoFocus
            />
          </div>
          <Button onClick={handleVerifyOTP} disabled={loginLoading} className="w-full h-12 rounded-2xl bg-black hover:bg-gray-800 text-base font-bold">
            {loginLoading ? 'Verifying...' : 'Verify & Login ✓'}
          </Button>
          <div className="text-center text-sm text-gray-500">
            {otpCountdown > 0 ? (
              <span>Resend OTP in {otpCountdown}s</span>
            ) : (
              <button onClick={() => { setLoginStep('phone'); setLoginOTP(''); setLoginError('') }} className="text-black font-semibold underline">
                Change number or resend
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
)

const ProfileDrawer = () => (
  <div className="fixed inset-0 z-[150] flex justify-end">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowProfileDrawer(false)} />
    <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
      {/* Header */}
      <div className="bg-black text-white p-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl font-black">
            {portalCustomer?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-bold text-lg">{portalCustomer?.name || 'Customer'}</p>
            <p className="text-white/60 text-sm">{portalCustomer?.phone}</p>
          </div>
        </div>
        <button onClick={() => setShowProfileDrawer(false)} className="text-white/70 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Points Banner */}
      {portalProfile && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-4 text-white flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs font-semibold opacity-80">LOYALTY POINTS</p>
            <p className="text-4xl font-black">{portalProfile.loyalty.current_points.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80">Lifetime Earned</p>
            <p className="text-xl font-bold">{portalProfile.loyalty.total_earned.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto no-scrollbar shrink-0">
        {(['loyalty', 'bookings', 'memberships', 'profile', 'referral'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setProfileTab(tab)}
            className={\`px-4 py-3 text-xs font-bold whitespace-nowrap capitalize transition-colors \${
              profileTab === tab ? 'border-b-2 border-black text-black' : 'text-gray-500 hover:text-gray-700'
            }\`}
          >
            {tab === 'loyalty' ? '⭐ Points' : tab === 'bookings' ? '📅 Bookings' : tab === 'memberships' ? '💳 Plans' : tab === 'profile' ? '👤 Profile' : '🎁 Refer'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {profileTab === 'loyalty' && (
          <div className="space-y-4">
            <h3 className="font-black text-lg">Loyalty Points</h3>
            {!portalProfile ? (
              <div className="h-32 bg-gray-100 animate-pulse rounded-2xl" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-yellow-50 rounded-2xl p-4">
                    <p className="text-xs text-gray-500">Available</p>
                    <p className="text-3xl font-black text-yellow-600">{portalProfile.loyalty.current_points}</p>
                    <p className="text-xs text-gray-400">points</p>
                  </div>
                  <div className="bg-green-50 rounded-2xl p-4">
                    <p className="text-xs text-gray-500">Total Earned</p>
                    <p className="text-3xl font-black text-green-600">{portalProfile.loyalty.total_earned}</p>
                    <p className="text-xs text-gray-400">lifetime</p>
                  </div>
                </div>
                {portalProfile.wallet_balance > 0 && (
                  <div className="bg-blue-50 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">Wallet Balance</p>
                      <p className="text-2xl font-black text-blue-600">{business?.currency || '₹'}{portalProfile.wallet_balance}</p>
                    </div>
                    <span className="text-3xl">💰</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {profileTab === 'bookings' && (
          <div className="space-y-3">
            <h3 className="font-black text-lg">My Bookings</h3>
            {!portalProfile ? (
              [1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />)
            ) : portalProfile.bookings.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-4xl mb-2">📅</p>
                <p>No bookings yet</p>
              </div>
            ) : (
              portalProfile.bookings.map((b: any) => (
                <div key={b.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-sm">{b.service_names || 'Appointment'}</p>
                    <span className={\`text-xs px-2 py-1 rounded-full font-semibold \${
                      b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }\`}>{b.status}</span>
                  </div>
                  <p className="text-xs text-gray-500">{b.booking_date} at {b.booking_time}</p>
                  {b.staff_name && <p className="text-xs text-gray-400">with {b.staff_name}</p>}
                  {b.total_amount > 0 && <p className="text-sm font-bold mt-1">{business?.currency || '₹'}{b.total_amount}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {profileTab === 'memberships' && (
          <div className="space-y-4">
            <h3 className="font-black text-lg">My Plans</h3>
            {!portalProfile ? (
              <div className="h-32 bg-gray-100 animate-pulse rounded-2xl" />
            ) : (
              <>
                {portalProfile.memberships.length === 0 && portalProfile.packages.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <p className="text-4xl mb-2">💳</p>
                    <p>No active plans</p>
                  </div>
                ) : (
                  <>
                    {portalProfile.memberships.map((m: any) => (
                      <div key={m.id} className="bg-purple-50 rounded-2xl p-4">
                        <p className="font-bold">{m.name}</p>
                        <p className="text-xs text-gray-500">Membership · Active</p>
                        {m.end_date && <p className="text-xs text-gray-400">Expires {m.end_date}</p>}
                      </div>
                    ))}
                    {portalProfile.packages.map((p: any) => (
                      <div key={p.id} className="bg-green-50 rounded-2xl p-4">
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.sessions_remaining} sessions remaining</p>
                        {p.expiry_date && <p className="text-xs text-gray-400">Expires {p.expiry_date}</p>}
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {profileTab === 'profile' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-lg">My Profile</h3>
              {!editingProfile && (
                <button onClick={() => { setEditingProfile(true); setProfileEditForm({ name: portalCustomer?.name, email: portalCustomer?.email, gender: portalCustomer?.gender }) }}
                  className="text-sm font-semibold text-black underline">Edit</button>
              )}
            </div>
            {editingProfile ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold">Name</Label>
                  <Input value={profileEditForm.name || ''} onChange={e => setProfileEditForm(p => ({...p, name: e.target.value}))} className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Email</Label>
                  <Input type="email" value={profileEditForm.email || ''} onChange={e => setProfileEditForm(p => ({...p, email: e.target.value}))} className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Date of Birth</Label>
                  <Input type="date" value={profileEditForm.date_of_birth || ''} onChange={e => setProfileEditForm(p => ({...p, date_of_birth: e.target.value}))} className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Anniversary</Label>
                  <Input type="date" value={profileEditForm.date_of_anniversary || ''} onChange={e => setProfileEditForm(p => ({...p, date_of_anniversary: e.target.value}))} className="rounded-xl mt-1" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSaveProfile} disabled={savingProfile} className="flex-1 bg-black text-white rounded-xl">{savingProfile ? 'Saving...' : 'Save'}</Button>
                  <Button variant="outline" onClick={() => setEditingProfile(false)} className="flex-1 rounded-xl">Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {[{label: 'Name', value: portalCustomer?.name}, {label: 'Phone', value: portalCustomer?.phone}, {label: 'Email', value: portalCustomer?.email}, {label: 'Date of Birth', value: portalCustomer?.date_of_birth}, {label: 'Anniversary', value: portalCustomer?.date_of_anniversary}].map(f => f.value ? (
                  <div key={f.label} className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 font-semibold">{f.label}</p>
                    <p className="font-medium mt-0.5">{f.value}</p>
                  </div>
                ) : null)}
              </div>
            )}
            <button onClick={handleLogout} className="w-full text-red-500 text-sm font-semibold border border-red-200 rounded-2xl py-3 hover:bg-red-50 transition-colors mt-4">
              Logout
            </button>
          </div>
        )}

        {profileTab === 'referral' && portalProfile && (
          <div className="space-y-4">
            <h3 className="font-black text-lg">Refer & Earn</h3>
            <div className="bg-gradient-to-br from-black to-gray-800 text-white rounded-3xl p-6 text-center">
              <p className="text-xs opacity-60 mb-2">YOUR REFERRAL CODE</p>
              <p className="text-3xl font-black tracking-widest mb-4">{portalProfile.referral.code}</p>
              <button
                onClick={() => { navigator.clipboard?.writeText(portalProfile.referral.code); alert('Copied!') }}
                className="bg-white text-black text-sm font-bold px-6 py-2 rounded-full"
              >
                Copy Code
              </button>
            </div>
            <div className="bg-green-50 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-green-600">{portalProfile.referral.referrals_count}</p>
              <p className="text-sm text-gray-600">Friends Referred</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600">
              <p className="font-bold mb-1">How it works</p>
              <p>Share your code with friends. When they complete their first booking, you both earn loyalty points!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)
`;
content = content.replace(/return \(\n\s*<div className="min-h-screen/, match => modalsStr + '\n  ' + match);

// 7. Header Button Replacement
const newHeaderBtn = `
          {/* Customer Login / Account Button */}
          {portalCustomer ? (
            <button
              onClick={() => { setShowProfileDrawer(true); setProfileTab('loyalty') }}
              className="flex items-center gap-2 bg-black text-white px-3 py-2 rounded-full text-xs font-bold hover:bg-gray-800 transition-colors"
            >
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-black">
                {portalCustomer.name?.charAt(0)?.toUpperCase()}
              </div>
              <span className="hidden sm:inline">{portalCustomer.name?.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-1.5 bg-black text-white px-3 py-2 rounded-full text-xs font-bold hover:bg-gray-800 transition-colors"
            >
              <span>👤</span>
              <span>Login</span>
            </button>
          )}
`;
content = content.replace(
  /<Button className="bg-black text-white hover:bg-gray-800 rounded-lg h-9 px-6 font-medium text-sm shadow-sm transition-transform hover:scale-105">\s*Login\s*<\/Button>/,
  newHeaderBtn
);

// 8. Render Modals
const renderModals = `
      {showLoginModal && <LoginModal />}
      {showProfileDrawer && <ProfileDrawer />}
`;
content = content.replace(/\{galleryLightboxImg && \(\n/, match => renderModals + '\n      ' + match);

fs.writeFileSync(file, content);
