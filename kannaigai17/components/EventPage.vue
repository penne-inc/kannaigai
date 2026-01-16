<script setup lang="ts">
import { staticEventData } from '../data/useEventData';

const { event, about, exhibition, talkSession, designPitch, kidsSpace } = staticEventData;
</script>

<template>
  <div class="event-page">
    <!-- ヘッダー -->
    <header class="event-header">
      <h1>{{ event.title }}<span>{{ event.subtitle }}</span></h1>
      <p class="event-date">{{ event.dateDisplay }} {{ event.time }}</p>
      <p class="event-venue">{{ event.venue.name }}</p>
    </header>

    <!-- ABOUT -->
    <section class="section about">
      <h2><span class="en">{{ about.titleEn }}</span>{{ about.titleJa }}</h2>
      <p>{{ about.description }}</p>
    </section>

    <!-- EXHIBITION -->
    <section class="section exhibition">
      <h2><span class="en">{{ exhibition.titleEn }}</span>{{ exhibition.titleJa }}</h2>
      <p class="section-description">{{ exhibition.description }}</p>

      <div class="projects">
        <article
          v-for="project in exhibition.projects"
          :key="project.id"
          class="project"
        >
          <span class="project-category">{{ project.category }}</span>
          <h3>{{ project.title }}</h3>
          <p>{{ project.description }}</p>
          <ul class="creators">
            <li v-for="creator in project.creators" :key="creator.name">
              {{ creator.name }}
              <span v-if="creator.affiliation">_{{ creator.affiliation }}</span>
            </li>
          </ul>
        </article>
      </div>
    </section>

    <!-- TALK SESSION -->
    <section class="section talk-session">
      <h2><span class="en">{{ talkSession.titleEn }}</span>{{ talkSession.titleJa }}</h2>
      <p class="section-description">{{ talkSession.description }}</p>
      <p class="session-time">時間: {{ talkSession.time }}</p>

      <div class="guests">
        <div v-for="guest in talkSession.guests" :key="guest.id" class="guest">
          <span class="guest-role">{{ guest.role }}</span>
          <p class="guest-name">{{ guest.name }}</p>
          <p v-if="guest.title" class="guest-title">{{ guest.title }}</p>
          <p v-if="guest.project" class="guest-project">{{ guest.project }}</p>
        </div>
      </div>
    </section>

    <!-- DESIGN PITCH -->
    <section class="section design-pitch">
      <h2><span class="en">{{ designPitch.titleEn }}</span>{{ designPitch.titleJa }}</h2>
      <p>{{ designPitch.description }}</p>
    </section>

    <!-- KIDS SPACE -->
    <section class="section kids-space">
      <h2><span class="en">{{ kidsSpace.titleEn }}</span>{{ kidsSpace.titleJa }}</h2>
      <p>{{ kidsSpace.description }}</p>
    </section>

    <!-- ACCESS -->
    <section class="section access">
      <h2><span class="en">ACCESS</span>アクセス</h2>
      <p class="venue-name">{{ event.venue.name }} {{ event.venue.nameEn }}</p>
      <p class="venue-address">{{ event.venue.address }}</p>
      <p class="venue-access">{{ event.venue.access }}</p>
    </section>
  </div>
</template>

<style scoped>
.event-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.section {
  margin-bottom: 4rem;
}

.section h2 {
  margin-bottom: 1.5rem;
}

.section h2 .en {
  display: block;
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.projects {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.project {
  padding: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.project-category {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #333;
  color: #fff;
  font-size: 0.75rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.creators {
  list-style: none;
  padding: 0;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: #666;
}

.guests {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.guest {
  text-align: center;
  padding: 1rem;
}

.guest-role {
  font-size: 0.75rem;
  color: #666;
}

.guest-name {
  font-weight: bold;
  margin: 0.5rem 0;
}
</style>
