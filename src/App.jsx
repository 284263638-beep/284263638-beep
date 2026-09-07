import { useEffect, useRef, useState } from 'react'
import './styles.css'
import './overrides.css'
import './cards.css'

const projects = [
  { title: '优范品牌设计', image: '/assets/projects/01.png', details: ['品牌策略：市场、消费者、竞品、产品与视觉风格调研', '品牌设计：VI、包装、线上线下物料', '活动策划：主题、场景、物料与传播策略'] },
  { title: '聚猩品牌设计', image: '/assets/juxon/01.png', details: ['设计策略：视觉风格定位与项目前期策划', 'VI体系：颜色、字体、物料、元素与版式设计'] },
  { title: '奇极品牌设计', image: '/assets/qiji/01.png', details: ['品牌策略：市场、消费者、竞品与视觉调研', 'VI与包装设计：材质、工艺与版式', '电商设计：主图、详情页与视觉模板'] },
  { title: '将军账号UI设计', image: '/assets/jiangjun/01.png', details: ['产品策略：游戏账号交易平台需求与用户分析', 'UI/UX设计：信息架构、低保真原型与界面设计', '交互设计：核心交易流程与可用性'] },
  { title: '既月下品牌设计', image: '/assets/jiyuexia/01.png', details: ['品牌策略：市场、消费者、竞品与视觉调研', 'VI体系：颜色、字体、物料、元素与版式设计', '包装设计：材质、工艺与包装版式'] },
  { title: '国控星鲨品牌设计', image: '/assets/xingsha/01.png', details: ['品牌策略：市场、消费者、竞品与视觉调研', 'VI体系：颜色、字体、物料、元素与版式设计', '包装设计：材质、工艺与包装版式'] },
  { title: '电竞兔IP设计', image: '/assets/page10/04.png?v=1', details: ['品牌调研：视觉风格、受众、竞品调研和分析', 'IP人格化策略', 'IP创意、插画、建模'] },
  { title: '其他设计', image: '/assets/projects/08.png?v=2', details: ['浪一夏盛夏音乐节KV插画', '厦门元宇宙产业人才基地KV插画', '四大美人IP插画'] },
]

const aboutProjectImages = ['/assets/about-projects/01.png', '/assets/about-projects/02.png', '/assets/about-projects/03.png', '/assets/jiangjun/01.png', '/assets/about-projects/05.png', '/assets/about-projects/06.png', '/assets/about-projects/07.png', '/assets/about-projects/08.png']
const youfanWorks = Array.from({ length: 24 }, (_, index) => `/assets/youfan/${String(index + 1).padStart(2, '0')}.png?v=2`)
const juxonWorks = Array.from({ length: 9 }, (_, index) => `/assets/juxon/${String(index + 1).padStart(2, '0')}.png`)
const qijiWorks = Array.from({ length: 11 }, (_, index) => `/assets/qiji/${String(index + 1).padStart(2, '0')}.png`)
const jiangjunWorks = Array.from({ length: 8 }, (_, index) => `/assets/jiangjun/${String(index + 1).padStart(2, '0')}.png`)
const jiyuexiaWorks = Array.from({ length: 11 }, (_, index) => `/assets/jiyuexia/${String(index + 1).padStart(2, '0')}.png`)
const xingshaWorks = Array.from({ length: 13 }, (_, index) => `/assets/xingsha/${String(index + 1).padStart(2, '0')}.png`)
const page10Works = Array.from({ length: 6 }, (_, index) => `/assets/page10/${String(index + 1).padStart(2, '0')}.png?v=1`)
const page11Works = Array.from({ length: 3 }, (_, index) => `/assets/page11/${String(index + 1).padStart(2, '0')}.png?v=1`)
const projectWorks = [youfanWorks, juxonWorks, qijiWorks, jiangjunWorks, jiyuexiaWorks, xingshaWorks, page10Works, page11Works]
const pageCount = 5
const numberWords = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT']

const headTurnAngleKeys = Object.freeze([
  { angle: -180, sourceFrame: 45, direction: 'left' },
  { angle: -150, sourceFrame: 4, direction: 'upper-left' },
  { angle: -120, sourceFrame: 7, direction: 'upper-left' },
  { angle: -90, sourceFrame: 11, direction: 'up' },
  { angle: -60, sourceFrame: 14, direction: 'upper-right' },
  { angle: -30, sourceFrame: 18, direction: 'upper-right' },
  { angle: 0, sourceFrame: 21, direction: 'right' },
  { angle: 30, sourceFrame: 25, direction: 'lower-right' },
  { angle: 60, sourceFrame: 29, direction: 'lower-right' },
  { angle: 90, sourceFrame: 35, direction: 'down' },
  { angle: 120, sourceFrame: 40, direction: 'lower-left' },
  { angle: 150, sourceFrame: 43, direction: 'lower-left' },
  { angle: 180, sourceFrame: 45, direction: 'left' },
])
const headTurnFrames = Object.freeze([...Array.from({ length: 42 }, (_, index) => index + 4), 52])
const headTurnFramePath = frame => `/assets/portfolio-2026/head-turn-instant4/frames/frame-${String(frame).padStart(3, '0')}.jpg?v=instant-4`

const scrollToPage = id => {
  const target = document.getElementById(id)
  if (!target) return
  const start = window.scrollY
  const end = target.offsetTop
  const started = performance.now()
  const duration = 1050
  const animate = now => {
    const progress = Math.min((now - started) / duration, 1)
    const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2
    window.scrollTo(0, start + (end - start) * eased)
    if (progress < 1) requestAnimationFrame(animate)
  }
  requestAnimationFrame(animate)
}

function ImageCard({ src, alt = '', onOpen }) {
  return <button type="button" className="image-card has-image" onClick={onOpen} aria-label={alt ? `打开${alt}` : undefined}><img src={src} alt={alt} loading="lazy" /></button>
}

function HeadTurnAnimation({ className = '' }) {
  const stageRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const stage = stageRef.current
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!stage || !video || !canvas) return undefined

    const displayWidth = 1280
    const displayHeight = 720
    const centerFrame = 52
    const deadZone = 54
    const responseMs = 24
    const frameInterval = 1000 / 60
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true })
    const bitmaps = new Map()
    const bitmapPromises = new Map()
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
    const angularDistance = (a, b) => Math.abs(((a - b + 540) % 360) - 180)
    let mounted = true
    let interactive = false
    let introStarted = false
    let isVisible = false
    let targetAngle = 0
    let currentAngle = 0
    let targetStrength = 0
    let currentStrength = 0
    let lastTime = performance.now()
    let lastFrameTime = 0
    let displayedFrame = -1
    let animationFrame = 0

    context.fillStyle = '#e3e5e6'
    context.fillRect(0, 0, displayWidth, displayHeight)

    const decodeFrame = async blob => {
      if ('createImageBitmap' in window) {
        return createImageBitmap(blob, {
          resizeWidth: displayWidth,
          resizeHeight: displayHeight,
          resizeQuality: 'high',
        })
      }
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob)
        const image = new Image()
        image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
        image.onerror = error => { URL.revokeObjectURL(url); reject(error) }
        image.src = url
      })
    }

    const prepareBitmap = frame => {
      if (!bitmapPromises.has(frame)) {
        bitmapPromises.set(frame, fetch(headTurnFramePath(frame), { cache: 'force-cache' })
          .then(response => {
            if (!response.ok) throw new Error(`Head-turn frame ${frame} failed: ${response.status}`)
            return response.blob()
          })
          .then(decodeFrame)
          .then(bitmap => {
            if (!mounted) bitmap.close?.()
            else bitmaps.set(frame, bitmap)
            return bitmap
          }))
      }
      return bitmapPromises.get(frame)
    }

    const priorityFrames = [52, 11, 21, 35, 45, 7, 14, 29, 40, 4, 18, 25, 43]
    priorityFrames.forEach(frame => { prepareBitmap(frame).catch(() => {}) })
    const remainingFrames = headTurnFrames.filter(frame => !priorityFrames.includes(frame))
    Array.from({ length: 4 }, async (_, workerIndex) => {
      for (let index = workerIndex; index < remainingFrames.length; index += 4) {
        try { await prepareBitmap(remainingFrames[index]) } catch { /* keep the nearest decoded frame */ }
      }
    })

    const getPivot = () => {
      const rect = stage.getBoundingClientRect()
      return { x: rect.left + rect.width * .61, y: rect.top + rect.height * .35 }
    }

    const nearestKey = angle => headTurnAngleKeys.reduce((nearest, key) => (
      angularDistance(angle, key.angle) < angularDistance(angle, nearest.angle) ? key : nearest
    ))

    const calibratedFrame = angle => {
      const normalized = ((angle + 540) % 360) - 180
      for (let index = 0; index < headTurnAngleKeys.length - 1; index += 1) {
        const start = headTurnAngleKeys[index]
        const end = headTurnAngleKeys[index + 1]
        if (normalized < start.angle || normalized > end.angle) continue
        const progress = (normalized - start.angle) / (end.angle - start.angle)
        if (start.sourceFrame > end.sourceFrame) return progress < .5 ? start.sourceFrame : end.sourceFrame
        return Math.round(start.sourceFrame + (end.sourceFrame - start.sourceFrame) * progress)
      }
      return centerFrame
    }

    const drawFrame = frame => {
      const bitmap = bitmaps.get(frame)
      if (!bitmap || frame === displayedFrame) return false
      context.globalAlpha = 1
      context.globalCompositeOperation = 'copy'
      context.drawImage(bitmap, 0, 0, displayWidth, displayHeight)
      displayedFrame = frame
      canvas.dataset.frame = String(frame)
      return true
    }

    const nearestReadyFrame = target => {
      if (bitmaps.has(target)) return target
      let nearest = displayedFrame
      let distance = Infinity
      for (const frame of bitmaps.keys()) {
        const candidateDistance = Math.abs(frame - target)
        if (candidateDistance < distance) {
          distance = candidateDistance
          nearest = frame
        }
      }
      return nearest
    }

    const fastStepToward = target => {
      if (displayedFrame < 0 || target === centerFrame || displayedFrame === centerFrame) return nearestReadyFrame(target)
      if (Math.abs(target - displayedFrame) > 20) return nearestReadyFrame(target)
      const distance = target - displayedFrame
      if (distance === 0) return target
      const step = Math.min(2, Math.max(1, Math.ceil(Math.abs(distance) * .42)))
      const candidate = displayedFrame + Math.sign(distance) * step
      if (bitmaps.has(candidate)) return candidate
      for (let offset = step - 1; offset >= 1; offset -= 1) {
        const fallback = displayedFrame + Math.sign(distance) * offset
        if (bitmaps.has(fallback)) return fallback
      }
      return nearestReadyFrame(target)
    }

    const render = now => {
      if (isVisible && interactive) {
        const delta = Math.min(48, now - lastTime)
        const easing = 1 - Math.exp(-delta / responseMs)
        const angleDelta = ((targetAngle - currentAngle + 540) % 360) - 180
        currentAngle += angleDelta * easing
        currentStrength += (targetStrength - currentStrength) * easing
        if (now - lastFrameTime >= frameInterval) {
          lastFrameTime = now
          const isCenter = currentStrength < .12
          const desiredFrame = isCenter ? centerFrame : calibratedFrame(currentAngle)
          drawFrame(fastStepToward(desiredFrame))
          canvas.dataset.direction = isCenter ? 'center' : nearestKey(currentAngle).direction
        }
      }
      lastTime = now
      animationFrame = requestAnimationFrame(render)
    }

    const finishIntro = async () => {
      if (interactive || !mounted) return
      try {
        const front = await prepareBitmap(centerFrame)
        if (!mounted) return
        context.globalAlpha = 1
        context.globalCompositeOperation = 'copy'
        context.drawImage(front, 0, 0, displayWidth, displayHeight)
        displayedFrame = centerFrame
        interactive = true
        video.pause()
        stage.classList.add('is-interactive')
        canvas.dataset.frame = String(centerFrame)
        canvas.dataset.direction = 'center'
        lastTime = performance.now()
      } catch {
        stage.classList.add('is-interactive')
      }
    }

    const startIntro = () => {
      if (!isVisible || introStarted || video.readyState < 1) return
      introStarted = true
      const playSegment = () => video.play().catch(finishIntro)
      video.addEventListener('seeked', playSegment, { once: true })
      video.currentTime = Math.min(4, Math.max(0, video.duration - .1))
    }

    const handleLoadedMetadata = () => startIntro()
    const handleTimeUpdate = () => {
      if (video.currentTime >= Math.min(6, video.duration)) finishIntro()
    }
    const handleVideoEnd = () => finishIntro()

    const updateTarget = event => {
      if (!interactive || !isVisible || (event.pointerType === 'touch' && !event.isPrimary)) return
      const pivot = getPivot()
      const dx = event.clientX - pivot.x
      const dy = event.clientY - pivot.y
      const distance = Math.hypot(dx, dy)
      if (distance <= deadZone) {
        targetStrength = 0
        return
      }
      targetAngle = Math.atan2(dy, dx) * 180 / Math.PI
      targetStrength = clamp((distance - deadZone) / 150, 0, 1)
    }

    const resetTarget = () => { targetStrength = 0 }
    const observer = new IntersectionObserver(entries => {
      isVisible = entries[0]?.isIntersecting ?? false
      if (isVisible) startIntro()
    }, { threshold: .08 })

    observer.observe(stage)
    window.addEventListener('pointermove', updateTarget, { passive: true })
    window.addEventListener('pointercancel', resetTarget)
    document.documentElement.addEventListener('mouseleave', resetTarget)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleVideoEnd)
    video.addEventListener('error', handleVideoEnd)
    if (video.readyState >= 1) startIntro()
    animationFrame = requestAnimationFrame(render)

    return () => {
      mounted = false
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
      window.removeEventListener('pointermove', updateTarget)
      window.removeEventListener('pointercancel', resetTarget)
      document.documentElement.removeEventListener('mouseleave', resetTarget)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleVideoEnd)
      video.removeEventListener('error', handleVideoEnd)
      video.pause()
      bitmaps.forEach(bitmap => bitmap.close?.())
    }
  }, [])

  return <span ref={stageRef} className={`head-turn-layer ${className}`.trim()} aria-hidden="true">
    <video ref={videoRef} src="/assets/portfolio-2026/head-turn-instant4/intro-source-4k.mp4" muted playsInline preload="auto" poster={headTurnFramePath(52)} />
    <canvas ref={canvasRef} width="1280" height="720" data-opaque="true" data-direction="intro" data-frame="52" />
  </span>
}

function PortfolioTopBar() {
  return <div className="portfolio-art-topbar" aria-hidden="true">
    <div className="portfolio-art-tags">
      <span>#Brand Strategy</span>
      <span>#UI Design</span>
      <span>#Operational Design</span>
      <span>#IP Design</span>
    </div>
    <span className="portfolio-art-meta">&lt;2026&gt; My Design Portfolio</span>
    <span className="portfolio-art-category">Brand Design</span>
  </div>
}

function PortfolioSideMeta() {
  return <div className="portfolio-art-side" aria-hidden="true">
    <span className="portfolio-art-welcome">Welcome to<br />Watch</span>
    <span className="portfolio-art-year">2026</span>
  </div>
}

function HeroForeground() {
  return <div className="portfolio-art-layer hero-art-layer" aria-label="樊雅婷 2026 设计作品集封面">
    <PortfolioTopBar />
    <div className="hero-art-title" aria-hidden="true">
      <span>DESIGN</span>
      <span>PORTFOLIO</span>
      <small>&lt;2026&gt;</small>
    </div>
    <div className="hero-art-profile">
      <strong>#樊雅婷</strong>
      <span>18534445031</span>
      <span>四年半经验</span>
      <span>284263638@qq.com</span>
    </div>
    <PortfolioSideMeta />
    <div className="hero-art-footer" aria-hidden="true">
      <div className="hero-art-footer-tags"><span>#品牌策划</span><span>#UI设计</span><span>#插画设计</span><span>#IP设计</span></div>
      <strong>#品牌设计作品集</strong>
    </div>
  </div>
}

function FinishForeground() {
  return <div className="portfolio-art-layer finish-art-layer" aria-label="Thanks for watching 作品集尾页">
    <PortfolioTopBar />
    <div className="finish-art-title" aria-hidden="true">
      <span>THANKS FOR</span>
      <span>WATCHING</span>
      <small>&lt;2026&gt;</small>
    </div>
    <PortfolioSideMeta />
    <div className="finish-art-copy">
      <strong>Thanks for watching</strong>
      <p>感谢您的时间与关注<br />期待未来更多的合作机会</p>
      <span>Let’s create something great together</span>
    </div>
    <strong className="finish-art-collection">#品牌设计作品集</strong>
  </div>
}

function AppNav({ active }) {
  return <nav className="dots" aria-label="页面导航">{Array.from({ length: pageCount }, (_, index) => <button key={index} className={active === index ? 'active' : ''} onClick={() => scrollToPage(`page-${index + 1}`)} aria-label={`前往第 ${index + 1} 页`} />)}</nav>
}

function ProjectCard({ project, index, onOpen }) {
  return <button type="button" className="project-card" onClick={() => onOpen(index)} aria-label={`查看${project.title}完整作品`}>
    <span className="project-card-media"><img src={project.image} alt={`${project.title}项目封面`} loading="lazy" /></span>
    <span className="project-card-content">
      <span className="project-card-heading"><span className="project-card-number">{String(index + 1).padStart(2, '0')}</span><strong>{project.title}</strong></span>
      <span className="project-card-word">{numberWords[index]}</span>
    </span>
    <span className="project-card-bottom">
      <span className="project-card-details">{project.details.map(detail => <span key={detail}>{detail}</span>)}</span>
      <span className="project-card-watch"><img src="/assets/portfolio-2026/watch-button-reference.png" alt="" aria-hidden="true" /></span>
    </span>
  </button>
}

function PortfolioPage({ pageNumber, onOpen }) {
  return <section id={`page-${pageNumber}`} className="screen portfolio-card-screen">
    <header className="portfolio-card-header">
      <h2><span>Design Project</span></h2>
      <span className="portfolio-card-kicker">MY DESIGN</span>
    </header>
    <div className="project-card-grid">{projects.map((project, index) => <ProjectCard key={project.title} project={project} index={index} onOpen={onOpen} />)}</div>
  </section>
}

const resumeExperiences = [
  {
    time: '2025/10—2026/6',
    role: '品牌设计组长',
    company: '西安聚猩智媒信息科技有限公司',
    details: [
      '多品牌设计资产管理：聚猩以及旗下子公司的品牌设计，包含奇极（电竞外设）/ JXG俱乐部 / 冠军调试（游戏服务器）/ 白泽园区（主播周边）',
      '视觉策划：对多品牌进行视觉定位，对不同设计项目进行策略制定',
      '品牌设计：管理品牌资产，包含但不限于物料设计、运营设计、UI设计、包装设计、IP设计等，并把控多品牌品牌调性',
      '团队管理：作为品牌设计组长，对新人员工和技能不足的同岗位员工进行培训和业务带练',
    ],
  },
  {
    time: '2024/9—2025/9',
    role: '企划主管',
    company: '山西优范品牌管理有限公司',
    details: [
      '品牌策划：定义品牌定位、调性、核心价值、视觉识别以及品牌故事，确保所有触点的一致性',
      '品牌传播与推广：策划并主导线上线下营销传播策划与设计，包含抖音、小红书等线上平台，以及线下美博会、招商会、线下活动策划等',
      '品牌设计：管理和维护品牌视觉识别系统，确保所有对内对外物料的品牌一致性；包含但不限于VI、LOGO、包装、展览、UI、拍剪、3D',
      '业务痛点通过可视化设计解决：与业务部门深度交流，将市场痛点与难题通过设计解决，提高业务部门工作效率',
    ],
  },
  {
    time: '2021/12—2024/8',
    role: '品牌设计师',
    company: '杭州逸恬品牌设计有限公司',
    details: [
      '进行不同品牌项目的视觉创意设计和项目管理',
      '独立完成品牌VI、LOGO、包装、展览等系统化视觉设计',
      '对接不同供应商，保证设计落地',
    ],
  },
]

function ResumePage() {
  const [openItem, setOpenItem] = useState(0)

  return <section id="page-3" className="screen resume-screen">
    <span className="resume-kicker">About Me</span>
    <h2><span>Curriculum Vitae</span></h2>
    <div className="resume-ip"><img className="resume-ip-single" src="/assets/portfolio-2026/resume-ip.png" alt="黑发白色外套IP形象" /></div>
    <div className="resume-list">
      {resumeExperiences.map((item, index) => {
        const isOpen = openItem === index
        return <article key={item.time} className={`resume-item${isOpen ? ' is-open' : ''}`}>
          <button type="button" className="resume-toggle" onClick={() => setOpenItem(index)} aria-expanded={isOpen}>
            <time>{item.time}</time>
            <strong>{item.role}</strong>
          </button>
          <div className="resume-detail" aria-hidden={!isOpen}>
            <h3>{item.company}</h3>
            <ol>{item.details.map(detail => <li key={detail}>{detail}</li>)}</ol>
          </div>
        </article>
      })}
    </div>
  </section>
}

function ProjectModal({ index, onClose }) {
  const dialogRef = useRef(null)
  const project = projects[index]
  const works = projectWorks[index]

  useEffect(() => {
    document.body.classList.add('modal-open')
    const handleKey = event => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    dialogRef.current?.focus()
    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return <div className="project-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section ref={dialogRef} className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title" tabIndex="-1">
      <header className="project-modal-header">
        <div><span>{String(index + 1).padStart(2, '0')} / {numberWords[index]}</span><h2 id="project-modal-title">{project.title}</h2></div>
        <button type="button" onClick={onClose} aria-label="关闭作品窗口">×</button>
      </header>
      <div className="project-modal-scroll" aria-label={`${project.title}作品滚动图`}>{works.map((src, workIndex) => <img key={src} src={src} alt={`${project.title}作品 ${workIndex + 1}`} loading={workIndex < 2 ? 'eager' : 'lazy'} />)}</div>
    </section>
  </div>
}

export function App() {
  const [active, setActive] = useState(0)
  const [selectedProject, setSelectedProject] = useState(null)

  useEffect(() => {
    const sections = [...document.querySelectorAll('section.screen')]
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return
      setActive(sections.indexOf(entry.target))
      entry.target.classList.add('page-entered')
    }), { threshold: 0.15 })
    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return <main>
    <AppNav active={active} />
    <section id="page-1" className="screen screenshot hero-screen white-hero">
      <HeadTurnAnimation className="hero-head-turn" />
      <span className="portfolio-background-accent" aria-hidden="true" />
      <HeroForeground />
    </section>
    <section id="page-2" className="screen about-screen">
      <div className="about-copy"><h2>About Me</h2><h3>专注于成为解决业务问题的<br />AI全链路设计管理者</h3><p>Committed to becoming an end-to-end<br />design leader who solves business<br />challenges</p></div>
      <div className="card-marquee" aria-label="设计项目循环展示"><div className="card-marquee-track">
        <div className="card-marquee-group">{projects.map((project, index) => <ImageCard key={`primary-${project.title}`} src={aboutProjectImages[index]} alt={`${project.title}项目封面`} onOpen={() => setSelectedProject(index)} />)}</div>
        <div className="card-marquee-group" aria-hidden="true">{projects.map((project, index) => <ImageCard key={`duplicate-${project.title}`} src={aboutProjectImages[index]} alt="" onOpen={() => setSelectedProject(index)} />)}</div>
      </div></div>
    </section>
    <ResumePage />
    <PortfolioPage pageNumber={4} onOpen={setSelectedProject} />
    <section id="page-5" className="screen screenshot finish-screen final-artboard">
      <HeadTurnAnimation className="finish-head-turn" />
      <span className="portfolio-background-accent" aria-hidden="true" />
      <FinishForeground />
      <button className="hotspot top" onClick={() => scrollToPage('page-1')} aria-label="返回顶部" />
    </section>
    {selectedProject !== null && <ProjectModal index={selectedProject} onClose={() => setSelectedProject(null)} />}
  </main>
}
