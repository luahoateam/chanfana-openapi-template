import { Bool, OpenAPIRoute, Str, ApiException } from "chanfana";
import { z } from "zod";

export class GenerateContentEndpoint extends OpenAPIRoute {
	schema = {
		tags: ["Marketing"],
		summary: "Tạo nội dung marketing từ mô hình tư duy",
		request: {
			body: {
				content: {
					mental_model_id: Str({ description: "ID của mô hình tư duy (vd: first-principles)" }),
					persona_id: Str({ description: "ID của đối tượng mục tiêu (vd: indie-hackers)" }),
					campaign_id: Str({ description: "ID của chiến dịch liên quan" }),
				}
			},
		},
		responses: {
			"200": {
				description: "Trả về nội dung đã tạo và ID bản thảo gốc",
				content: {
					"application/json": {
						schema: {
							success: Bool(),
							result: {
								master_id: Str(),
								draft: Str(),
							},
						},
					},
				},
			},
		},
	};

	async handle(c: any) {
		const data = await this.getValidatedData<any>();
		const { mental_model_id, persona_id, campaign_id } = data.body;

		// 1. Lấy tri thức từ D1
		const knowledge: any = await c.env.DB.prepare(
			"SELECT content FROM knowledge_chunks WHERE id = ?"
		).bind(mental_model_id).first();

		if (!knowledge) {
			throw new ApiException(`Không tìm thấy tri thức cho mô hình: ${mental_model_id}`, 404);
		}

		// 2. Lấy thông tin Persona
		const persona: any = await c.env.DB.prepare(
			"SELECT name, description FROM personas WHERE id = ?"
		).bind(persona_id).first();

		// 3. Gọi AI để tạo bản thảo
		const prompt = `Bạn là một chuyên gia Marketing kỳ cựu. 
Hãy viết một bài viết chuyên sâu dựa trên tri thức: "${knowledge.content}".
Đối tượng độc giả: ${persona ? persona.name : persona_id} (${persona ? persona.description : ""}).
Yêu cầu: Viết theo phong cách điềm đạm, chuyên nghiệp, thấu cảm của một người đi trước (Bác Bình).
Mục tiêu: Giúp họ hiểu cách áp dụng tư duy này vào đầu tư chứng khoán.`;

		let draft = "";
		try {
			const aiResponse = await c.env.AI.run("@cf/qwen/qwen2.5-7b-instruct", {
				prompt: prompt,
			});
			draft = aiResponse.response;
		} catch (e: any) {
			throw new ApiException(`Lỗi khi gọi AI: ${e.message}`, 500);
		}

		const masterId = crypto.randomUUID();

		// 4. Lưu vào content_master trong D1
		try {
			await c.env.DB.prepare(
				"INSERT INTO content_master (id, campaign_id, title, raw_draft) VALUES (?, ?, ?, ?)"
			).bind(masterId, campaign_id, `Draft cho ${mental_model_id}`, draft).run();
		} catch (e: any) {
			throw new ApiException(`Lỗi khi lưu Database: ${e.message}`, 500);
		}

		return {
			success: true,
			result: {
				master_id: masterId,
				draft: draft,
			},
		};
	}
}
