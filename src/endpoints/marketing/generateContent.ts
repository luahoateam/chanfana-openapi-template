import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";

export class GenerateContentEndpoint extends OpenAPIRoute {
	schema = {
		tags: ["Marketing"],
		summary: "Tạo nội dung marketing từ mô hình tư duy",
		request: {
			body: {
				content: z.object({
					mental_model_id: Str({ description: "ID của mô hình tư duy (vd: first-principles)" }),
					persona_id: Str({ description: "ID của đối tượng mục tiêu (vd: indie-hackers)" }),
					campaign_id: Str({ description: "ID của chiến dịch liên quan" }),
				}),
			},
		},
		responses: {
			"200": {
				description: "Trả về nội dung đã tạo và ID bản thảo gốc",
				content: {
					"application/json": {
						schema: z.object({
							success: Bool(),
							result: z.object({
								master_id: Str(),
								draft: Str(),
							}),
						}),
					},
				},
			},
		},
	};

	async handle(c: any) {
		const data = await this.getValidatedData<any>();
		const { mental_model_id, persona_id, campaign_id } = data.body;

		// 1. Lấy tri thức từ D1
		const knowledge = await c.env.DB.prepare(
			"SELECT content FROM knowledge_chunks WHERE id = ?"
		).bind(mental_model_id).first();

		if (!knowledge) {
			return { success: false, errors: ["Không tìm thấy tri thức cho mô hình này."] };
		}

		// 2. Lấy thông tin Persona
		const persona = await c.env.DB.prepare(
			"SELECT name, description FROM personas WHERE id = ?"
		).bind(persona_id).first();

		// 3. Gọi AI để tạo bản thảo (Prompt Engineering)
		const prompt = `Bạn là một chuyên gia Marketing kỳ cựu. 
Hãy viết một bài viết chuyên sâu dựa trên tri thức: "${knowledge.content}".
Đối tượng độc giả: ${persona ? persona.name : persona_id} (${persona ? persona.description : ""}).
Yêu cầu: Viết theo phong cách điềm đạm, chuyên nghiệp, thấu cảm của một người đi trước (Bác Bình).
Mục tiêu: Giúp họ hiểu cách áp dụng tư duy này vào đầu tư chứng khoán.`;

		const aiResponse = await c.env.AI.run("@cf/qwen/qwen2.5-7b-instruct", {
			prompt: prompt,
		});

		const draft = aiResponse.response;
		const masterId = crypto.randomUUID();

		// 4. Lưu vào content_master trong D1
		await c.env.DB.prepare(
			"INSERT INTO content_master (id, campaign_id, title, raw_draft) VALUES (?, ?, ?, ?)"
		).bind(masterId, campaign_id, `Draft cho ${mental_model_id}`, draft).run();

		return {
			success: true,
			result: {
				master_id: masterId,
				draft: draft,
			},
		};
	}
}
