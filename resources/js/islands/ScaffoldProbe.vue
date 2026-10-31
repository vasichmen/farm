<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'ScaffoldProbe',
    props: {
        message: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            clicks: 0,
        };
    },
    computed: {
        buttonLabel(): string {
            return this.clicks === 0 ? 'Проверить интерактивность' : `Нажатий: ${this.clicks}`;
        },
    },
});
</script>

<template>
    <div class="scaffold-probe">
        <p class="scaffold-probe__message">{{ message }}</p>
        <button type="button" class="scaffold-probe__button" @click="clicks += 1">
            {{ buttonLabel }}
        </button>
    </div>
</template>
