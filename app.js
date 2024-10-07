// app.ts
var { createApp } = Vue;
var app = createApp({
  data() {
    return {
      books: [],
      currentBook: {
        title: "",
        author: "",
        published_year: "",
      },
      notifications: [],
      isEditing: false,
    };
  },
  computed: {
    sortedBooks() {
      return [...this.books].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    },
  },
  methods: {
    fetchBooks() {
      fetch("http://localhost:3000/books")
        .then((res) => res.json())
        .then((data) => {
          this.books = data;
        });
    },
    addBook() {
      fetch("http://localhost:3000/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.currentBook),
      }).then(() => {
        this.fetchBooks();
        this.currentBook = { title: "", author: "", published_year: "" };
      });
    },
    editBook(book) {
      this.isEditing = true;
      this.currentBook = { ...book };
    },
    updateBook() {
      fetch(`http://localhost:3000/books/${this.currentBook.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.currentBook),
      }).then(() => {
        this.fetchBooks();
        this.cancelEdit();
      });
    },
    cancelEdit() {
      this.isEditing = false;
      this.currentBook = { title: "", author: "", published_year: "" };
    },
    confirmDelete(id) {
      console.log(id);
      this.currentBook.id = id;
      const modal = new bootstrap.Modal(
        document.getElementById("deleteConfirmModal")
      );
      modal.show();
    },
    deleteBook() {
      console.log(this.currentBook.id);
      fetch(`http://localhost:3000/books/${this.currentBook.id}`, {
        method: "DELETE",
      }).then(() => {
        this.fetchBooks();
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("deleteConfirmModal")
        );
        modal.hide();
        this.fetchBooks();
      });
    },
    removeNotification(index) {
      this.notifications.splice(index, 1);
    },
  },
  mounted() {
    this.fetchBooks();
    const ws = new WebSocket("ws://localhost:3001");
    ws.onmessage = (event) => {
      const notification = event.data;
      this.notifications.push(notification);
      const audio = document.getElementById("notificationSound");
      audio.play();
      this.fetchBooks();

      // Automatically remove the notification after 5 seconds
      setTimeout(() => {
        const index = this.notifications.indexOf(notification);
        if (index > -1) {
          this.notifications.splice(index, 1);
        }
      }, 5000);
    };
  },
});
app.mount("#app");
